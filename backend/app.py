from flask import Flask, request, jsonify
from flask_cors import CORS
import tensorflow as tf
from tensorflow import keras
import numpy as np
import cv2

app = Flask(__name__)
CORS(app)  # allows React frontend to call this API

# Load the trained model once when server starts
import os
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
model = keras.models.load_model(os.path.join(BASE_DIR, '..', 'model', 'best_model_v2.keras'))
classes = ['Center', 'Donut', 'Edge-Loc', 'Edge-Ring', 'Loc', 'Near-full', 'Random', 'Scratch', 'none']

def preprocess_image(file):
    file_bytes = np.frombuffer(file.read(), np.uint8)
    img = cv2.imdecode(file_bytes, cv2.IMREAD_GRAYSCALE)
    img = cv2.resize(img, (128, 128), interpolation=cv2.INTER_NEAREST)

    # Map standard grayscale (0-255) back into the 3 training codes: 0=blank, 1=normal, 2=defective
    img_mapped = np.zeros_like(img, dtype='float32')
    img_mapped[(img >= 64) & (img < 192)] = 1.0
    img_mapped[img >= 192] = 2.0

    img_mapped = img_mapped / 3.0   # same normalization as training
    img_mapped = img_mapped.reshape(1, 128, 128, 1)
    return img_mapped

def get_severity(defect_type, confidence):
    """Simple business logic for severity levels"""
    if defect_type == 'none':
        return 'Pass'
    elif confidence < 0.6:
        return 'Monitor'
    else:
        return 'Reject'

@app.route('/predict', methods=['POST'])
def predict():
    if 'image' not in request.files:
        return jsonify({'error': 'No image uploaded'}), 400

    file = request.files['image']
    img = preprocess_image(file)

    predictions = model.predict(img)
    pred_idx = np.argmax(predictions[0])
    defect_type = classes[pred_idx]
    confidence = float(predictions[0][pred_idx])

    severity = get_severity(defect_type, confidence)

    return jsonify({
        'defect_type': defect_type,
        'confidence': round(confidence * 100, 2),
        'severity': severity
    })

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'Server is running'})

if __name__ == '__main__':
    app.run(debug=True, port=5000)