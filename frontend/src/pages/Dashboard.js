import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { buildReport, generateReport, DEFECT_INFO, VERDICT_META } from '../utils/report';
import '../App.css';
import './Report.css';

const ZOOM_STEP = 0.25;
const ZOOM_MIN = 1;
const ZOOM_MAX = 3;

function Dashboard() {
  const [mode, setMode] = useState('upload'); // 'upload' or 'camera'
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [sampleId, setSampleId] = useState('');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [error, setError] = useState(null);
  const [zoom, setZoom] = useState(1);

  // When the camera tab opens, read the zoom level the Pi is currently using
  useEffect(() => {
    if (mode !== 'camera') return;
    fetch('/zoom')
      .then((r) => r.json())
      .then((d) => setZoom(d.level))
      .catch(() => {});
  }, [mode]);

  const changeZoom = (value) => {
    const level = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, value));
    setZoom(level);
    fetch('/zoom', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level }),
    }).catch(() => {});
  };

  const clearAll = () => {
    setFile(null);
    setPreviewUrl(null);
    setReport(null);
    setError(null);
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    clearAll();
  };

  const handleFileChange = (e) => {
    const picked = e.target.files[0];
    if (picked) {
      setFile(picked);
      setPreviewUrl(URL.createObjectURL(picked));
      setReport(null);
      setError(null);
    }
  };

  const callServer = async (url, options) => {
    setLoading(true);
    setError(null);
    setReport(null);
    try {
      const response = await fetch(url, options);
      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || 'Server error');
      }
      setReport(
        buildReport({
          result: data,
          mode,
          file,
          sampleId,
          sampleSrc: mode === 'upload' ? previewUrl : `data:image/jpeg;base64,${data.snapshot}`,
          zoom: data.zoom !== undefined ? data.zoom : zoom,
        })
      );
    } catch (err) {
      setError(err.message || 'Analysis failed. Is the server running?');
    } finally {
      setLoading(false);
    }
  };

  const handleRun = () => {
    if (mode === 'upload') {
      if (!file) return;
      const formData = new FormData();
      formData.append('image', file);
      callServer('/predict', { method: 'POST', body: formData });
    } else {
      callServer('/predict-camera');
    }
  };

  const handleDownload = async () => {
    if (!report) return;
    setReporting(true);
    try {
      await generateReport(report);
    } catch (err) {
      setError('Could not create the report PDF.');
    } finally {
      setReporting(false);
    }
  };

  const vm = report ? VERDICT_META[report.result.severity] || VERDICT_META.Monitor : null;
  const info = report
    ? DEFECT_INFO[report.result.defect_type] || { description: '-', cause: '-' }
    : null;

  return (
    <div className="app">
      <div className="scanline" />

      <Link to="/" className="back-link">← Back to home</Link>

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
            className={mode === 'camera' ? 'mode-btn active' : 'mode-btn'}
            onClick={() => switchMode('camera')}
          >
            Use Camera
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

          {mode === 'upload' && previewUrl && (
            <div className="preview-zone">
              <img src={previewUrl} alt="wafer preview" />
              <button className="ghost-btn small" onClick={clearAll}>
                Choose another
              </button>
            </div>
          )}

          {mode === 'camera' && (
            <div className="webcam-zone">
              <img src="/video_feed" alt="live camera" className="webcam-feed" />

              <div className="zoom-bar">
                <button
                  className="zoom-btn"
                  onClick={() => changeZoom(zoom - ZOOM_STEP)}
                  disabled={zoom <= ZOOM_MIN}
                  aria-label="Zoom out"
                >
                  −
                </button>
                <input
                  type="range"
                  min={ZOOM_MIN}
                  max={ZOOM_MAX}
                  step={ZOOM_STEP}
                  value={zoom}
                  onChange={(e) => changeZoom(parseFloat(e.target.value))}
                  aria-label="Zoom level"
                />
                <button
                  className="zoom-btn"
                  onClick={() => changeZoom(zoom + ZOOM_STEP)}
                  disabled={zoom >= ZOOM_MAX}
                  aria-label="Zoom in"
                >
                  +
                </button>
                <span className="zoom-label">{zoom.toFixed(2)}×</span>
                <button className="ghost-btn small" onClick={() => changeZoom(1)}>
                  Reset
                </button>
              </div>

              <p className="hint">Place the wafer map inside the green square</p>
            </div>
          )}
        </div>

        <input
          className="sample-input"
          type="text"
          placeholder="Sample ID (optional), e.g. WAFER-001"
          value={sampleId}
          onChange={(e) => setSampleId(e.target.value)}
          maxLength={40}
        />

        <button
          className="analyze-btn"
          onClick={handleRun}
          disabled={loading || (mode === 'upload' && !file)}
        >
          {loading
            ? 'Analyzing…'
            : mode === 'upload'
            ? 'Run Detection'
            : 'Capture & Detect'}
        </button>

        {error && <p className="error-text">{error}</p>}

        {report && (
          <div className="report-card" style={{ '--accent': vm.color }}>
            <div className="report-head">
              <span className="report-title">Test Report</span>
              <span className="report-id mono">{report.id}</span>
            </div>

            <div className="report-meta">
              <div>
                <span>Sample ID</span>
                <b>{report.sampleId}</b>
              </div>
              <div>
                <span>Tested on</span>
                <b>{report.testedAtText}</b>
              </div>
              <div>
                <span>Sample source</span>
                <b>{report.sourceText}</b>
              </div>
              <div>
                <span>{report.detailLabel}</span>
                <b>{report.detailValue}</b>
              </div>
            </div>

            <div className="shots">
              <div className="shot">
                <img
                  className={report.mode === 'camera' ? 'photo' : undefined}
                  src={report.sampleSrc}
                  alt="sample"
                />
                <span>Sample image</span>
              </div>
              <div className="shot">
                <img
                  src={`data:image/png;base64,${report.result.model_input}`}
                  alt="model input"
                />
                <span>Model input</span>
              </div>
            </div>

            <div className="report-result">
              <div>
                <div className="report-defect">{report.result.defect_type}</div>
                <div className="report-sub">
                  Confidence {report.result.confidence}% · {report.result.inference_ms} ms
                </div>
              </div>
              <span className="verdict-badge" style={{ background: vm.color, color: vm.textColor }}>
                {vm.label}
              </span>
            </div>

            {report.result.top3 && (
              <div className="bars">
                {report.result.top3.map((t) => (
                  <div className="bar-row" key={t.label}>
                    <span>{t.label}</span>
                    <div className="bar-track">
                      <div className="bar-fill" style={{ width: `${Math.max(1, t.confidence)}%` }} />
                    </div>
                    <span className="mono">{t.confidence}%</span>
                  </div>
                ))}
              </div>
            )}

            <div className="report-notes">
              <p>
                <strong>Pattern observed</strong>
                {info.description}
              </p>
              <p>
                <strong>Probable cause</strong>
                {info.cause}
              </p>
              <p>
                <strong>Recommended action</strong>
                {vm.action}
              </p>
            </div>

            <button className="report-btn" onClick={handleDownload} disabled={reporting}>
              {reporting ? 'Preparing PDF…' : 'Download Report (PDF)'}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

export default Dashboard;
