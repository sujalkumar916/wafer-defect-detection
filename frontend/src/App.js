import { useState, useRef, useCallback } from 'react';
import './App.css';

function App() {
  const [mode, setMode] = useState('upload'); // 'upload' or 'webcam'
  const [previewUrl, setPreviewUrl] = useState(null);
  const [capturedBlob, setCapturedBlob] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [streamActive, setStreamActive] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const resetResult = () => {
    setResult(null);
    setError(null);
  };

  // ---- Upload mode ----
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCapturedBlob(file);
      setPreviewUrl(URL.createObjectURL(file));
      resetResult();
    }
  };

  // ---- Webcam mode ----
  const startWebcam = useCallback(async () => {
    resetResult();
    setPreviewUrl(null);
    setCapturedBlob(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setStreamActive(true);
    } catch (err) {
      setError('Could not access webcam. Check camera permissions.');
    }
  }, []);

  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setStreamActive(false);
  };

  const captureFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      setCapturedBlob(blob);
      setPreviewUrl(URL.createObjectURL(blob));
    }, 'image/png');

    stopWebcam();
  };

  const switchMode = (newMode) => {
    stopWebcam();
    setMode(newMode);
    setPreviewUrl(null);
    setCapturedBlob(null);
    resetResult();
  };

  // ---- Analyze ----
  const handleAnalyze = async () => {
    if (!capturedBlob) return;
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('image', capturedBlob, 'wafer.png');

    try {
      const response = await fetch('http://127.0.0.1:5000/predict', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) throw new Error('Server error');
      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError('Analysis failed. Is the backend server running on port 5000?');
    } finally {
      setLoading(false);
    }
  };

  const severityMeta = {
    Pass: { color: '#3DDC97', label: 'PASS' },
    Monitor: { color: '#F0B429', label: 'MONITOR' },
    Reject: { color: '#EF4444', label: 'REJECT' },
  };

  return (
    <div className="app">
      <div className="scanline" />

      <header className="header">
        <span className="header-kicker">Wafer Inspection Unit</span>
        <h1>Defect Detection Console</h1>
      </header>

      <main className="panel">
        <div className="mode-toggle">
          <button
            className={mode === 'upload' ? 'mode-btn active' : 'mode-btn'}
            onClick={() => switchMode('upload')}
          >
            Upload Image
          </button>
          <button
            className={mode === 'webcam' ? 'mode-btn active' : 'mode-btn'}
            onClick={() => switchMode('webcam')}
          >
            Use Webcam
          </button>
        </div>

        <div className="capture-stage">
          {mode === 'upload' && !previewUrl && (
            <label className="drop-zone">
              <input type="file" accept="image/*" onChange={handleFileChange} hidden />
              <span className="drop-icon">⤒</span>
              <span>Select a wafer map image</span>
            </label>
          )}

          {mode === 'webcam' && !previewUrl && (
            <div className="webcam-zone">
              <video ref={videoRef} autoPlay playsInline muted className="webcam-feed" />
              {!streamActive && (
                <button className="ghost-btn" onClick={startWebcam}>
                  Start Camera
                </button>
              )}
              {streamActive && (
                <button className="capture-btn" onClick={captureFrame}>
                  Capture
                </button>
              )}
            </div>
          )}

          {previewUrl && (
            <div className="preview-zone">
              <img src={previewUrl} alt="wafer preview" />
              <button
                className="ghost-btn small"
                onClick={() => {
                  setPreviewUrl(null);
                  setCapturedBlob(null);
                  resetResult();
                }}
              >
                Retake
              </button>
            </div>
          )}

          <canvas ref={canvasRef} hidden />
        </div>

        <button
          className="analyze-btn"
          onClick={handleAnalyze}
          disabled={!capturedBlob || loading}
        >
          {loading ? 'Analyzing…' : 'Run Detection'}
        </button>

        {error && <p className="error-text">{error}</p>}

        {result && (
          <div className="result-panel" style={{ '--accent': severityMeta[result.severity]?.color }}>
            <div className="result-row">
              <span className="result-label">Defect Type</span>
              <span className="result-value mono">{result.defect_type}</span>
            </div>
            <div className="result-row">
              <span className="result-label">Confidence</span>
              <span className="result-value mono">{result.confidence}%</span>
            </div>
            <div className="verdict" style={{ color: severityMeta[result.severity]?.color }}>
              {severityMeta[result.severity]?.label || result.severity}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;