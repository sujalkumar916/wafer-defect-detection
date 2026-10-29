import { useState, useRef, useEffect } from 'react';
import './ChatWidget.css';

// Each entry: keywords (lowercase) and an answer.
// The entry whose matched keywords add up to the longest total wins, so specific phrases beat generic ones.
const FAQ = [
  // ---------- Semiconductor basics ----------
  {
    keywords: ["what is a semiconductor", "what is semiconductor", "semiconductor kya", "define semiconductor", "semiconductor meaning", "explain semiconductor"],
    answer: "A semiconductor is a material whose electrical conductivity sits between a conductor (like copper) and an insulator (like glass), and can be controlled precisely. That control lets us build tiny switches called transistors, and from them every modern chip. Silicon is the most widely used semiconductor.",
  },
  {
    keywords: ["why silicon", "why is silicon", "silicon is used", "made from sand", "made of sand"],
    answer: "Silicon is abundant (it is refined from sand), its conductivity is easy to control by doping, and it forms silicon dioxide, a stable insulating layer that is ideal for building transistors. Those three properties made it the industry standard.",
  },
  {
    keywords: ["what is doping", "doping", "n-type", "p-type", "impurit"],
    answer: "Doping means adding tiny, controlled amounts of impurity atoms to pure silicon. Phosphorus adds extra electrons (n-type) and boron creates “holes” (p-type). Joining n-type and p-type regions is how diodes and transistors are made.",
  },
  {
    keywords: ["what is a transistor", "transistor", "mosfet", "billions of"],
    answer: "A transistor is a tiny electronic switch (or amplifier). Turning it on and off represents the 1s and 0s of digital logic. Modern processors pack billions of them onto a chip smaller than a coin.",
  },
  {
    keywords: ["integrated circuit", "what is a chip", "what is an ic", "microchip", "what is chip"],
    answer: "An integrated circuit (IC), or chip, is a complete electronic circuit with thousands to billions of transistors built on a small piece of semiconductor. Many identical chips are made together on one wafer and then cut apart.",
  },
  {
    keywords: ["what is a die", "what are dies", "die vs chip", "dies on"],
    answer: "A die is one individual chip-sized rectangle on a wafer. A wafer holds hundreds to thousands of dies depending on their size. After testing, the wafer is cut (diced) and each good die is packaged into a finished chip.",
  },
  {
    keywords: ["what is a wafer", "wafer kya", "silicon wafer", "wafer size", "300 mm", "300mm"],
    answer: "A wafer is a thin, round slice of semiconductor material, usually silicon, on which many chips are manufactured at the same time. Common diameters are 200 mm and 300 mm.",
  },
  {
    keywords: ["what is a wafer map", "what is wafer map", "wafer map", "bin map", "pass fail map", "pass/fail map"],
    answer: "A wafer map is a grid picture of a wafer where each cell is one die, coloured by its test result (pass or fail). Engineers read the pattern of failed dies to work out what went wrong in the process. This project classifies those patterns automatically.",
  },
  {
    keywords: ["what is moore", "moore"],
    answer: "Moore’s law is the observation, made by Gordon Moore, that the number of transistors on a chip doubles roughly every two years. It guided the industry’s roadmap for decades, although the pace has slowed as transistors approach atomic scales.",
  },
  {
    keywords: ["nanometer", "nm node", "3nm", "5nm", "7nm", "node size", "process node"],
    answer: "Process nodes such as 7 nm or 3 nm name chip generations. Smaller numbers generally mean more transistors in the same area, with better speed and lower power. Today the numbers are more of a marketing label than a literal measurement.",
  },
  {
    keywords: ["india", "semicon india"],
    answer: "India has launched the India Semiconductor Mission to build a domestic ecosystem covering chip design, fabrication and packaging. Skills like wafer inspection and yield analysis, which this project touches, are part of that value chain.",
  },

  // ---------- Manufacturing ----------
  {
    keywords: ["fabrication", "manufactur", "how are chips made", "how chips are made", "fab process", "process steps"],
    answer: "Chip fabrication repeats a cycle of steps on the wafer, layer after layer: oxidation, photolithography (print the pattern), etching (remove material), deposition (add thin films), doping by ion implantation, and polishing. After hundreds of steps the wafer is tested, diced and packaged.",
  },
  {
    keywords: ["photolithography", "lithography", "photoresist", "euv"],
    answer: "Photolithography prints circuit patterns onto the wafer. The wafer is coated with light-sensitive photoresist, light is projected through a mask, and the exposed regions are developed away. The most advanced chips use extreme ultraviolet (EUV) light for the finest features.",
  },
  {
    keywords: ["etching", "deposition", "chemical mechanical", "polishing"],
    answer: "Etching removes material in the exact pattern defined by lithography. Deposition adds thin layers such as insulators and metals. Chemical mechanical polishing (CMP) flattens the surface between layers. A mistake in any of these can leave a defect pattern on the wafer.",
  },
  {
    keywords: ["cleanroom", "clean room", "clean-room", "bunny suit"],
    answer: "A cleanroom is an ultra-clean factory space with filtered air, because a single dust particle can ruin a die. Workers wear full “bunny suits” so skin, hair and clothing fibres do not contaminate the wafers.",
  },
  {
    keywords: ["yield", "good dies"],
    answer: "Yield is the percentage of dies on a wafer that pass testing: good dies divided by total dies. Higher yield means a lower cost per chip, which is why finding and fixing defect patterns early is so valuable.",
  },
  {
    keywords: ["what is wafer probing", "wafer probing", "wafer sort", "probe card", "probe", "electrical test"],
    answer: "Wafer probing (wafer sort) tests every die while it is still on the wafer. A probe card with tiny needles touches each die’s contact pads, the tester runs electrical checks, and each die is marked pass or fail. The result is the wafer map that this project analyses.",
  },

  // ---------- Defects ----------
  {
    keywords: ["why do defects", "defects occur", "causes of defect", "cause of defect", "defect cause", "root cause", "why defect"],
    answer: "Defects come from particles and contamination, scratches from handling or polishing, uneven etching or deposition, equipment drift, and process variation across the wafer. The shape of the pattern often hints at which step caused it.",
  },
  {
    keywords: ["why inspect", "why detect", "why is defect detection", "why important", "importance", "benefit"],
    answer: "A single wafer carries thousands of dies, and every defect lowers yield and raises cost. Spotting a pattern early lets engineers trace it to a process step and fix it before more wafers are affected.",
  },
  {
    keywords: ["defect types", "types of defect", "which defects", "what defects", "what does it detect", "what do you detect", "electronic image", "classes"],
    answer: "The system recognises nine wafer-map patterns: Center, Donut, Edge-Loc, Edge-Ring, Loc, Near-full, Random, Scratch, and none (no defect). Ask me about any of them.",
  },
  {
    keywords: ["center defect", "center pattern", "what is center", "centre defect"],
    answer: "Center defects are failed dies clustered in the middle of the wafer. They are often linked to a process that behaves differently at the wafer centre, such as uneven film thickness or gas flow.",
  },
  {
    keywords: ["donut"],
    answer: "A Donut pattern is a ring of failures with a healthier area in the middle. It usually points to a radially symmetric process issue.",
  },
  {
    keywords: ["edge-ring", "edge ring"],
    answer: "Edge-Ring shows failures along the whole outer rim of the wafer. Edges are harder to process uniformly, and this is one of the most common patterns in the dataset used here.",
  },
  {
    keywords: ["edge-loc", "edge loc"],
    answer: "Edge-Loc is a localized cluster of failed dies near the edge, rather than a full ring. It can point to a local problem such as handling or contact at that spot.",
  },
  {
    keywords: ["loc defect", "loc pattern", "what is loc", "localized", "localised"],
    answer: "Loc (localized) is a compact cluster of failed dies somewhere inside the wafer, away from the edge. It can come from a local particle or a local process disturbance, and it is the hardest class for this model.",
  },
  {
    keywords: ["near-full", "near full"],
    answer: "Near-full means almost every die on the wafer failed. It indicates a severe, process-wide failure and is usually the easiest pattern for the model to spot.",
  },
  {
    keywords: ["random defect", "random pattern", "what is random"],
    answer: "Random defects are scattered failed dies without a clear shape, typically caused by particles or general contamination across the wafer.",
  },
  {
    keywords: ["scratch"],
    answer: "Scratch is a thin line of failed dies, often from a mechanical scratch during handling or polishing. It is one of the hardest patterns because the line is only a few dies wide. A 128×128 input and extra training samples raised its detection a lot in this project.",
  },
  {
    keywords: ["none class", "no defect", "what is none", "normal wafer"],
    answer: "“none” means no systematic defect pattern: the wafer has only the normal scattering of a few failed dies, so it is treated as a pass.",
  },

  // ---------- This project ----------
  {
    keywords: ["how does this work", "how it works", "how does this project work", "project work", "pipeline", "workflow"],
    answer: "The system works in four steps: capture (upload an image or use the camera), preprocess (crop, resize to 128×128 and map brightness to three levels), classify (a CNN scores nine patterns), and decide (Pass, Monitor or Reject from the confidence).",
  },
  {
    keywords: ["how to use", "how do i use", "get started", "instructions", "demo"],
    answer: "Open the Detection Console, choose Upload Image or Use Camera, and press the run button. You will see the defect type, confidence, a Pass, Monitor or Reject verdict, the top three guesses, and what the model saw.",
  },
  {
    keywords: ["accuracy", "how accurate", "how good", "f1", "precision", "recall"],
    answer: "The CNN reaches about 93% accuracy on a held-out test set across nine classes. Results are uneven by class: edge and full-wafer patterns are strongest, while localized patterns like Loc are hardest. Live camera accuracy also depends on lighting and alignment.",
  },
  {
    keywords: ["dataset", "wm-811k", "wm811k", "training data", "data used"],
    answer: "WM-811K is a public dataset of 811,457 wafer maps, of which about 173,000 carry a defect label. Because “none” dominated, we undersampled it and augmented the small classes, giving roughly 43,000 balanced samples.",
  },
  {
    keywords: ["cnn", "convolutional", "neural network", "architecture", "parameters", "model"],
    answer: "It is a convolutional neural network (CNN) with five convolution blocks, max-pooling, dropout, a dense layer and a 9-way softmax output, with roughly 1.5 million parameters. Convolution layers learn local patterns like rings and lines, and the dense layers combine them into a decision.",
  },
  {
    keywords: ["imbalance", "balanced", "undersampl", "oversampl", "augment"],
    answer: "Normal wafers outnumbered some defect classes by more than 900 to 1, so a model could score high by always answering “none”. We undersampled the majority class, augmented minority classes with rotations and flips, and used class weights during training.",
  },
  {
    keywords: ["tflite", "tensorflow lite", "litert", "edge deploy", "lightweight"],
    answer: "TensorFlow Lite (now called LiteRT) is a compact runtime for running trained models on small devices. Our model shrinks to about 6 MB, gives the same predictions as the original, and runs in well under 100 ms on the Raspberry Pi 4.",
  },
  {
    keywords: ["raspberry", "pi 4", "hardware", "embedded", "edge device"],
    answer: "The whole system runs on a Raspberry Pi 4: the camera, the AI model, the web server and this dashboard. No cloud or laptop is needed, which keeps it low cost and lets it work offline.",
  },
  {
    keywords: ["webcam", "camera", "zoom", "capture"],
    answer: "In Use Camera mode the USB camera shows a live view. Use the zoom slider to bring a small wafer map closer, line it up inside the green square, then press Capture & Detect. The green square is exactly the area the model sees.",
  },
  {
    keywords: ["severity", "pass monitor reject", "confidence", "reject", "monitor"],
    answer: "Pass means no defect pattern was found. Reject means a defect was found with confidence of 60% or more. Monitor means the model is not sure (below 60%), so the wafer should be re-captured or checked manually.",
  },
  {
    keywords: ["how fast", "speed", "inference time", "latency", "how long"],
    answer: "A prediction takes roughly 55 to 90 ms on the Raspberry Pi 4, so a result appears almost instantly.",
  },
  {
    keywords: ["real wafer", "actual wafer", "photo of wafer", "real image", "surface photo"],
    answer: "Photos of real wafers show surface scratches, particles and stains, which is a different problem from classifying wafer maps. This project classifies wafer maps (test-result patterns). Handling real photos would need a separate model trained on labelled surface images.",
  },
  {
    keywords: ["limitation", "weakness", "drawback", "future scope", "future work"],
    answer: "The model is trained on wafer maps, not on photos of real silicon, so it expects a wafer-map image. Camera results depend on lighting and alignment. Future work: train on real wafer photos, add more defect classes, and fine-tune on data from the target factory.",
  },
  {
    keywords: ["cost", "low cost", "budget", "price"],
    answer: "The system uses a Raspberry Pi 4, a USB camera and open-source software (Python, TensorFlow Lite, Flask, React), so its cost is a small fraction of industrial inspection systems.",
  },
  {
    keywords: ["who made", "who built", "who developed", "vit-ap", "vit ap", "university", "guide", "mahapatra"],
    answer: "This is a capstone project from VIT-AP University, guided by Dr. Subhasish Mahapatra.",
  },
];

const SUGGESTIONS = [
  "What is a semiconductor?",
  "What is a wafer map?",
  "Why do defects occur?",
  "What is wafer probing?",
  "What is yield?",
  "How does this project work?",
];

const GREETING = "Hello! Ask me about semiconductors, wafer defects, or how this project works.";

const DEFAULT_REPLY =
  "I do not have an answer for that yet. Try asking about semiconductors, wafers, dies, yield, wafer probing, a defect pattern (like Scratch or Donut), or how this project works.";

function getAnswer(message) {
  const text = message.toLowerCase().trim();

  if (/^(hi|hii|hello|hey|namaste)\b/.test(text)) return GREETING;

  let best = null;
  let bestScore = 0;
  for (const item of FAQ) {
    let score = 0;
    for (const k of item.keywords) {
      if (text.includes(k)) score += k.length;
    }
    if (score > bestScore) {
      best = item;
      bestScore = score;
    }
  }
  return best ? best.answer : DEFAULT_REPLY;
}

function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { from: 'bot', text: "Hi! Ask me about semiconductors, wafer defects, or how this project works." },
  ]);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const send = (raw) => {
    const text = raw.trim();
    if (!text) return;
    setMessages((prev) => [...prev, { from: 'user', text }]);
    setInput('');
    setTimeout(() => {
      setMessages((prev) => [...prev, { from: 'bot', text: getAnswer(text) }]);
    }, 350);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') send(input);
  };

  return (
    <div className="chat-widget">
      {open && (
        <div className="chat-panel">
          <div className="chat-header">
            <span>Ask me about semiconductors</span>
            <button className="chat-close" onClick={() => setOpen(false)}>×</button>
          </div>

          <div className="chat-body">
            {messages.map((m, i) => (
              <div key={i} className={`chat-bubble ${m.from}`}>
                {m.text}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          <div className="chat-chips">
            {SUGGESTIONS.map((s) => (
              <button key={s} className="chat-chip" onClick={() => send(s)}>
                {s}
              </button>
            ))}
          </div>

          <div className="chat-input-row">
            <input
              type="text"
              placeholder="Ask a question…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button onClick={() => send(input)}>Send</button>
          </div>
        </div>
      )}

      <button className="chat-fab" onClick={() => setOpen((o) => !o)}>
        {open ? '×' : '💬'}
      </button>
    </div>
  );
}

export default ChatWidget;
