import { jsPDF } from 'jspdf';

// ---------- Shared text used by both the on-screen report and the PDF ----------

export const VERDICT_META = {
  Pass: {
    label: 'PASS',
    color: '#3DDC97',
    rgb: [61, 220, 151],
    textColor: '#04201C',
    textRgb: [4, 32, 28],
    action: 'No systematic defect pattern was detected. The wafer can proceed to the next stage.',
  },
  Monitor: {
    label: 'MONITOR',
    color: '#F0B429',
    rgb: [240, 180, 41],
    textColor: '#2A1E00',
    textRgb: [42, 30, 0],
    action:
      'The model confidence is below 60%. Re-capture the sample with better alignment and lighting, or verify it manually before deciding.',
  },
  Reject: {
    label: 'REJECT',
    color: '#EF4444',
    rgb: [239, 68, 68],
    textColor: '#FFFFFF',
    textRgb: [255, 255, 255],
    action:
      'A defect pattern was detected. Hold this wafer and review the process step associated with this pattern before further processing.',
  },
};

export const DEFECT_INFO = {
  Center: {
    description: 'Failed dies are clustered in the middle of the wafer.',
    cause: 'Often linked to process steps that behave differently at the wafer centre, such as uneven film thickness or gas flow.',
  },
  Donut: {
    description: 'A ring of failed dies with a healthier area in the middle.',
    cause: 'Usually points to a radially symmetric process issue.',
  },
  'Edge-Loc': {
    description: 'A localized cluster of failed dies near the wafer edge.',
    cause: 'Can point to a local problem such as handling or contact at that spot.',
  },
  'Edge-Ring': {
    description: 'Failed dies along the whole outer rim of the wafer.',
    cause: 'Edges are harder to process uniformly; non-uniform etching, coating or deposition at the edge is a common suspect.',
  },
  Loc: {
    description: 'A compact cluster of failed dies inside the wafer, away from the edge.',
    cause: 'Can come from a local particle or a local process disturbance.',
  },
  'Near-full': {
    description: 'Almost every die on the wafer has failed.',
    cause: 'Indicates a severe, process-wide failure.',
  },
  Random: {
    description: 'Scattered failed dies without a clear shape.',
    cause: 'Typically caused by particles or general contamination across the wafer.',
  },
  Scratch: {
    description: 'A thin line of failed dies.',
    cause: 'Often a mechanical scratch from handling or polishing.',
  },
  none: {
    description: 'No systematic defect pattern; only the normal scattering of a few failed dies.',
    cause: 'Not applicable.',
  },
};

// ---------- Small helpers ----------

const pad = (n) => String(n).padStart(2, '0');

function formatDateTime(d) {
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}:${pad(d.getSeconds())}`;
}

function makeReportId(d) {
  return `WDR-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(
    d.getMinutes()
  )}${pad(d.getSeconds())}`;
}

// The built-in PDF fonts only handle plain ASCII reliably
const ascii = (s) => String(s).replace(/[^\x20-\x7E]/g, '?');

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Draw an image centred on a square canvas and return a PNG data URL.
// pixelated = true keeps the blocky look of wafer maps when enlarging.
async function toSquarePng(src, size, pixelated) {
  const img = await loadImage(src);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, size, size);
  ctx.imageSmoothingEnabled = !pixelated;
  const scale = Math.min(size / img.width, size / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
  return canvas.toDataURL('image/png');
}

// ---------- Report data ----------

export function buildReport({ result, mode, file, sampleId, sampleSrc, zoom }) {
  const testedAt = new Date();
  return {
    id: makeReportId(testedAt),
    testedAtText: formatDateTime(testedAt),
    sampleId: (sampleId || '').trim() || 'Not provided',
    mode,
    sourceText: mode === 'upload' ? 'Uploaded wafer map image' : 'Live camera capture',
    detailLabel: mode === 'upload' ? 'Image file' : 'Digital zoom',
    detailValue: mode === 'upload' ? (file ? file.name : 'unknown') : `${Number(zoom || 1).toFixed(2)}x`,
    sampleSrc,
    result,
  };
}

// ---------- PDF ----------

export async function generateReport(report) {
  const { result } = report;
  const vm = VERDICT_META[result.severity] || VERDICT_META.Monitor;
  const info = DEFECT_INFO[result.defect_type] || { description: '-', cause: '-' };

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210;
  const M = 15;
  const CW = W - 2 * M;

  const DARK = [17, 24, 39];
  const GREY = [107, 114, 128];
  const LINE = [229, 231, 235];
  const TEAL = [45, 212, 191];
  const TEAL_DARK = [13, 148, 136];

  let y = 0;

  const section = (title) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...TEAL_DARK);
    doc.text(title, M, y);
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.3);
    doc.line(M, y + 1.8, W - M, y + 1.8);
    y += 7;
  };

  // ----- Header -----
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...DARK);
  doc.text('WAFER DEFECT INSPECTION REPORT', M, 17);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...GREY);
  doc.text('VIT-AP University  |  Capstone Project  |  AI-Based Semiconductor Defect Detection', M, 23);

  doc.setFontSize(8.5);
  doc.text(`Report ID: ${report.id}`, W - M, 11, { align: 'right' });
  doc.text(`Date: ${report.testedAtText}`, W - M, 15.5, { align: 'right' });

  doc.setDrawColor(...TEAL);
  doc.setLineWidth(0.8);
  doc.line(M, 27, W - M, 27);
  y = 36;

  // ----- Sample information -----
  section('SAMPLE INFORMATION');
  const rows = [
    ['Sample ID', report.sampleId],
    ['Sample source', report.sourceText],
    [report.detailLabel, report.detailValue],
    ['Test date and time', report.testedAtText],
    ['Tested by', 'Automated inspection unit (Raspberry Pi 4)'],
  ];
  const RH = 6.5;
  const LW = 48;
  rows.forEach(([k, v]) => {
    doc.setFillColor(243, 244, 246);
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.2);
    doc.rect(M, y, LW, RH, 'FD');
    doc.rect(M + LW, y, CW - LW, RH, 'S');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...GREY);
    doc.text(ascii(k), M + 2.5, y + 4.4);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...DARK);
    doc.text(doc.splitTextToSize(ascii(v), CW - LW - 5)[0], M + LW + 2.5, y + 4.4);
    y += RH;
  });
  y += 8;

  // ----- Images -----
  section('SAMPLE IMAGES');
  const [sampleImg, modelImg] = await Promise.all([
    toSquarePng(report.sampleSrc, 512, report.mode === 'upload'),
    toSquarePng(`data:image/png;base64,${result.model_input}`, 512, true),
  ]);
  const IS = 52;
  const half = CW / 2;
  const x1 = M + (half - IS) / 2;
  const x2 = M + half + (half - IS) / 2;
  doc.addImage(sampleImg, 'PNG', x1, y, IS, IS);
  doc.addImage(modelImg, 'PNG', x2, y, IS, IS);
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.3);
  doc.rect(x1, y, IS, IS);
  doc.rect(x2, y, IS, IS);
  y += IS + 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...GREY);
  doc.text('Sample image', x1 + IS / 2, y, { align: 'center' });
  doc.text('Processed input seen by the model', x2 + IS / 2, y, { align: 'center' });
  y += 9;

  // ----- Test result -----
  section('TEST RESULT');
  const cols = [
    ['Predicted pattern', result.defect_type],
    ['Confidence', `${result.confidence}%`],
    ['Verdict', vm.label],
    ['Inference time', `${result.inference_ms} ms`],
  ];
  const colW = CW / 4;

  doc.setFillColor(...DARK);
  doc.rect(M, y, CW, 6.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  cols.forEach(([label], i) => {
    doc.text(label, M + i * colW + colW / 2, y + 4.4, { align: 'center' });
  });
  y += 6.5;

  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.3);
  doc.rect(M, y, CW, 12);
  for (let i = 1; i < 4; i += 1) {
    doc.line(M + i * colW, y, M + i * colW, y + 12);
  }
  cols.forEach(([label, value], i) => {
    const cx = M + i * colW + colW / 2;
    if (label === 'Verdict') {
      doc.setFillColor(...vm.rgb);
      doc.roundedRect(cx - 14, y + 2.5, 28, 7, 2, 2, 'F');
      doc.setTextColor(...vm.textRgb);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(value, cx, y + 7.3, { align: 'center' });
    } else {
      doc.setTextColor(...DARK);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(ascii(value), cx, y + 7.6, { align: 'center' });
    }
  });
  y += 12 + 6;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...GREY);
  doc.text('Top 3 predictions', M, y);
  y += 5;
  (result.top3 || []).forEach((t) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...DARK);
    doc.text(ascii(t.label), M, y + 3.2);
    doc.setFillColor(...LINE);
    doc.rect(M + 38, y + 0.6, 100, 3.2, 'F');
    doc.setFillColor(...vm.rgb);
    doc.rect(M + 38, y + 0.6, Math.max(0.8, Math.min(100, t.confidence)), 3.2, 'F');
    doc.text(`${t.confidence}%`, M + 143, y + 3.2);
    y += 6.2;
  });
  y += 5;

  // ----- Interpretation -----
  section('INTERPRETATION AND RECOMMENDATION');
  const para = (label, text) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...DARK);
    doc.text(label, M, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(55, 65, 81);
    const lines = doc.splitTextToSize(ascii(text), CW - 40);
    doc.text(lines, M + 40, y);
    y += lines.length * 4.3 + 2.2;
  };
  para('Pattern observed', info.description);
  para('Probable cause', info.cause);
  para('Recommended action', vm.action);

  // ----- Signatures and method note -----
  let sy;
  if (y > 240) {
    doc.addPage();
    sy = 40;
  } else {
    sy = Math.max(y + 6, 248);
  }

  doc.setDrawColor(...GREY);
  doc.setLineWidth(0.3);
  doc.line(M, sy, M + 80, sy);
  doc.line(W - M - 80, sy, W - M, sy);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...GREY);
  doc.text('Tested by', M, sy + 4.5);
  doc.text('Verified by (Guide: Dr. Subhasish Mahapatra)', W - M - 80, sy + 4.5);

  const note =
    'Method: the sample is converted to a three-level wafer map (outside wafer, normal die, defective die), resized to 128 x 128 and classified by a convolutional neural network (5 convolution blocks, about 1.5 million parameters) trained on the WM-811K dataset and run as a TensorFlow Lite model on a Raspberry Pi 4. Accuracy on the held-out digital test set: 93%. Verdict rule: Pass = no defect pattern; Monitor = confidence below 60%; Reject = defect pattern with confidence of 60% or more. This report is generated automatically for academic demonstration; results depend on image quality and lighting.';
  doc.setFontSize(7.5);
  doc.text(doc.splitTextToSize(note, CW), M, sy + 12);

  doc.save(`Wafer_Report_${report.id}.pdf`);
}
