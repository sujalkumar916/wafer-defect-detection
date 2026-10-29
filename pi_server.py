import os
import time
import threading
import base64

import cv2
import numpy as np
from flask import Flask, Response, jsonify, request, send_from_directory
from flask_cors import CORS
from ai_edge_litert.interpreter import Interpreter

import lcd_display  # shows results on the 16x2 LCD (does nothing if no LCD is connected)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(BASE_DIR, 'frontend_build')

CLASSES = ['Center', 'Donut', 'Edge-Loc', 'Edge-Ring', 'Loc',
           'Near-full', 'Random', 'Scratch', 'none']

MIN_ZOOM, MAX_ZOOM = 1.0, 3.0

interp = Interpreter(model_path=os.path.join(BASE_DIR, 'wafer_model.tflite'))
interp.allocate_tensors()
inp = interp.get_input_details()[0]
out = interp.get_output_details()[0]
lock = threading.Lock()

# Camera is read continuously in a background thread so the live preview stays smooth
cap = cv2.VideoCapture(0, cv2.CAP_V4L2)
cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
latest = {'frame': None}
state = {'zoom': 1.0}


def reader():
    while True:
        ok, frame = cap.read()
        if ok:
            latest['frame'] = frame
        else:
            time.sleep(0.05)


threading.Thread(target=reader, daemon=True).start()


def zoom_crop(frame, z):
    """Digital zoom: keep the central 1/z part of the frame."""
    if z <= 1.0:
        return frame
    h, w = frame.shape[:2]
    nh, nw = int(h / z), int(w / z)
    y, x = (h - nh) // 2, (w - nw) // 2
    return frame[y:y + nh, x:x + nw]


def center_square(img):
    h, w = img.shape[:2]
    s = min(h, w)
    y, x = (h - s) // 2, (w - s) // 2
    return img[y:y + s, x:x + s]


def to_levels(gray):
    """Map brightness into the 3 levels the model was trained on:
    0 = outside wafer, 1 = normal die, 2 = defective die."""
    small = cv2.resize(gray, (128, 128), interpolation=cv2.INTER_AREA)
    data = small.reshape(-1, 1).astype(np.float32)
    cv2.setRNGSeed(0)
    crit = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 20, 1.0)
    _, labels, centers = cv2.kmeans(data, 3, None, crit, 5, cv2.KMEANS_PP_CENTERS)
    order = np.argsort(centers.flatten())      # darkest -> brightest
    rank = np.zeros(3, dtype=np.int32)
    rank[order] = [0, 1, 2]
    return rank[labels.flatten()].reshape(128, 128)


def b64_png(arr):
    _, buf = cv2.imencode('.png', arr)
    return base64.b64encode(buf.tobytes()).decode()


def run_model(levels):
    x = (levels / 3.0).reshape(1, 128, 128, 1).astype(np.float32)
    t = time.time()
    with lock:
        interp.set_tensor(inp['index'], x)
        interp.invoke()
        probs = interp.get_tensor(out['index'])[0].copy()
    ms = (time.time() - t) * 1000

    order = np.argsort(probs)[::-1]
    i = int(order[0])
    conf = float(probs[i])
    if conf < 0.6:
        severity = 'Monitor'
    elif CLASSES[i] == 'none':
        severity = 'Pass'
    else:
        severity = 'Reject'

    result = {
        'defect_type': CLASSES[i],
        'confidence': round(conf * 100, 1),
        'severity': severity,
        'inference_ms': round(ms),
        'top3': [{'label': CLASSES[j], 'confidence': round(float(probs[j]) * 100, 1)}
                 for j in order[:3]],
        'model_input': b64_png((levels * 127).astype(np.uint8)),
    }

    # Update the LCD in a background thread so the web response is not delayed
    threading.Thread(
        target=lcd_display.show_result,
        args=(CLASSES[i], conf * 100, severity, round(ms)),
        daemon=True,
    ).start()

    return result


app = Flask(__name__, static_folder=None)
CORS(app)


@app.route('/health')
def health():
    return jsonify({'status': 'Server is running'})


@app.route('/zoom', methods=['GET', 'POST'])
def zoom():
    if request.method == 'POST':
        data = request.get_json(silent=True) or {}
        try:
            level = float(data.get('level', 1.0))
        except (TypeError, ValueError):
            level = 1.0
        state['zoom'] = max(MIN_ZOOM, min(MAX_ZOOM, level))
    return jsonify({'level': state['zoom']})


def stream():
    while True:
        f = latest['frame']
        if f is not None:
            h, w = f.shape[:2]
            view = zoom_crop(f, state['zoom'])
            if view.shape[:2] != (h, w):
                view = cv2.resize(view, (w, h), interpolation=cv2.INTER_LINEAR)
            else:
                view = view.copy()
            s = min(h, w)
            y, x = (h - s) // 2, (w - s) // 2
            # The green square is exactly the area the model will see
            cv2.rectangle(view, (x, y), (x + s, y + s), (0, 255, 0), 2)
            ok, buf = cv2.imencode('.jpg', view)
            if ok:
                yield (b'--frame\r\nContent-Type: image/jpeg\r\n\r\n'
                       + buf.tobytes() + b'\r\n')
        time.sleep(0.05)


@app.route('/video_feed')
def video_feed():
    return Response(stream(), mimetype='multipart/x-mixed-replace; boundary=frame')


@app.route('/predict', methods=['POST'])
def predict_upload():
    if 'image' not in request.files:
        return jsonify({'error': 'No image uploaded'}), 400
    raw = np.frombuffer(request.files['image'].read(), np.uint8)
    img = cv2.imdecode(raw, cv2.IMREAD_GRAYSCALE)
    if img is None:
        return jsonify({'error': 'Could not read this image file'}), 400
    return jsonify(run_model(to_levels(img)))


@app.route('/predict-camera')
def predict_camera():
    frame = latest['frame']
    if frame is None:
        return jsonify({'error': 'Camera not ready. Check the USB camera.'}), 503
    zoomed = zoom_crop(frame.copy(), state['zoom'])
    square = center_square(zoomed)
    gray = cv2.cvtColor(square, cv2.COLOR_BGR2GRAY)
    result = run_model(to_levels(gray))
    snap = cv2.resize(square, (256, 256), interpolation=cv2.INTER_AREA)
    _, jpg = cv2.imencode('.jpg', snap)
    result['snapshot'] = base64.b64encode(jpg.tobytes()).decode()
    result['zoom'] = state['zoom']
    return jsonify(result)


# ---- Serve the React build (home page, /detect, assets) ----
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_frontend(path):
    if not os.path.isdir(FRONTEND_DIR):
        return 'Frontend not found. Copy the React build to ~/frontend_build', 404
    full = os.path.join(FRONTEND_DIR, path)
    if path and os.path.isfile(full):
        return send_from_directory(FRONTEND_DIR, path)
    return send_from_directory(FRONTEND_DIR, 'index.html')


if __name__ == '__main__':
    lcd_display.show_ready()
    app.run(host='0.0.0.0', port=5000, threaded=True)
