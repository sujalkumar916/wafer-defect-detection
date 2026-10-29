import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import ChatWidget from '../components/ChatWidget';
import './Home.css';
import chipBg from '../assets/chip-bg.jpg';

function Home() {
  const revealRefs = useRef([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      { threshold: 0.15 }
    );

    revealRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const bg = document.querySelector('.bg-grid');
    const onScroll = () => {
      if (bg) {
        bg.style.transform = `translateY(${window.scrollY * 0.15}px)`;
      }
    };
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const addRef = (el) => {
    if (el && !revealRefs.current.includes(el)) revealRefs.current.push(el);
  };

  return (
    <div className="home">
      <div className="bg-grid" aria-hidden="true" />

      {/* HERO */}
      <section className="hero" style={{ backgroundImage: `url(${chipBg})` }}>
        <div className="chip-visual" aria-hidden="true">
          <svg viewBox="0 0 400 400" className="chip-svg">
            <rect x="140" y="140" width="120" height="120" rx="6" className="chip-body" />
            {[...Array(6)].map((_, i) => (
              <g key={`pin-${i}`}>
                <line x1={160 + i * 16} y1="140" x2={160 + i * 16} y2="100" className="pin" />
                <line x1={160 + i * 16} y1="260" x2={160 + i * 16} y2="300" className="pin" />
                <line x1="140" y1={160 + i * 16} x2="100" y2={160 + i * 16} className="pin" />
                <line x1="260" y1={160 + i * 16} x2="300" y2={160 + i * 16} className="pin" />
              </g>
            ))}
            <circle cx="200" cy="200" r="150" className="orbit orbit-1" />
            <circle cx="200" cy="200" r="180" className="orbit orbit-2" />
            <circle className="pulse" r="4">
              <animateMotion dur="4s" repeatCount="indefinite" path="M200,50 A150,150 0 1,1 199,50" />
            </circle>
          </svg>
        </div>

        <span className="hero-kicker">VIT-AP University · Capstone Project</span>
        <h1>See every defect<br />before it ships.</h1>
        <p className="hero-sub">
          An AI vision system that reads wafer maps and live camera captures,
          classifies defect patterns, and flags rejects — in under a second, on commodity hardware.
        </p>
        <Link to="/detect" className="cta-btn">Run Detection →</Link>
      </section>

      {/* STATS */}
      <section className="stats reveal" ref={addRef}>
        <div className="stat"><span className="stat-num">93%</span><span className="stat-label">Test accuracy</span></div>
        <div className="stat"><span className="stat-num">9</span><span className="stat-label">Defect classes</span></div>
        <div className="stat"><span className="stat-num">43K</span><span className="stat-label">Training samples</span></div>
        <div className="stat"><span className="stat-num">&lt;1s</span><span className="stat-label">Inference time</span></div>
      </section>

      {/* HOW IT WORKS */}
      <section className="process reveal" ref={addRef}>
        <h2>How it works</h2>
        <div className="steps">
          <div className="step">
            <span className="step-no">01</span>
            <h3>Capture</h3>
            <p>Upload a wafer map image or capture one live through a connected webcam.</p>
          </div>
          <div className="step">
            <span className="step-no">02</span>
            <h3>Preprocess</h3>
            <p>The image is resized and normalized to match the model's expected input format.</p>
          </div>
          <div className="step">
            <span className="step-no">03</span>
            <h3>Classify</h3>
            <p>A trained convolutional neural network scores the image across nine defect patterns.</p>
          </div>
          <div className="step">
            <span className="step-no">04</span>
            <h3>Decide</h3>
            <p>A confidence-based severity rule returns Pass, Monitor, or Reject instantly.</p>
          </div>
        </div>
      </section>

      {/* DETECT CTA SECTION */}
      <section className="detect-cta reveal" ref={addRef}>
        <h2>Ready to inspect a wafer?</h2>
        <p>Open the detection console to upload an image or use your webcam.</p>
        <Link to="/detect" className="cta-btn large">Open Detection Console →</Link>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <p>© {new Date().getFullYear()} VIT-AP University. All rights reserved.</p>
        <p>Capstone Project · Guide: Dr. Subhasish Mahapatra</p>
      </footer>

      <ChatWidget />
    </div>
  );
}
export default Home;