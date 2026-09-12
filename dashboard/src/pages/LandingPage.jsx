import { Link } from 'react-router-dom';
import {
  Sparkles,
  Camera,
  Cpu,
  Activity,
  Droplets,
  ShieldCheck,
  History,
  ArrowRight,
  Zap,
  Layers,
  Radio,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import logo from '../assets/bioagent-logo.jpeg';
import { useAuth } from '../context/AuthContext.jsx';
import './LandingPage.css';

export default function LandingPage() {
  const { isAuthenticated, user } = useAuth();

  return (
    <div className="landing-container">
      {/* Navigation Bar */}
      <header className="landing-nav">
        <Link to="/" className="landing-nav__brand">
          <img src={logo} alt="BioAgent AI logo" className="landing-nav__logo" />
          <span className="landing-nav__title">BioAgent AI</span>
        </Link>
        <div className="landing-nav__actions">
          {isAuthenticated ? (
            <Link to="/dashboard" className="btn-live-demo" style={{ padding: '10px 22px', fontSize: '14px' }}>
              Dashboard ({user?.username || 'User'})
              <ArrowRight size={16} />
            </Link>
          ) : (
            <>
              <Link to="/login" className="btn-secondary-auth" style={{ padding: '9px 20px', fontSize: '14px' }}>
                Login
              </Link>
              <Link to="/demo" className="btn-live-demo" style={{ padding: '9px 22px', fontSize: '14px' }}>
                Live Demo
                <Zap size={15} />
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="landing-hero">
        <div className="landing-badge">
          <Sparkles size={14} />
          <span>Smart India Hackathon 2026 Innovation</span>
        </div>

        <h1 className="landing-hero__title">BioAgent AI</h1>
        <h2 className="landing-hero__subtitle">Autonomous Smart Irrigation System</h2>
        <p className="landing-hero__tagline">
          AI-powered plant care powered by Groq, PlantNet, and Edge Computing.
          Intelligent botanical monitoring with deterministic failsafe protection.
        </p>

        <div className="landing-hero__cta">
          <Link to="/demo" className="btn-live-demo" id="hero-live-demo-btn">
            <Zap size={18} />
            <span>Live Demo</span>
          </Link>
          <Link to="/login" className="btn-secondary-auth" id="hero-login-signup-btn">
            <span>Login / Signup</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="landing-section">
        <div className="section-header">
          <h3 className="section-header__title">Core Capabilities</h3>
          <p className="section-header__desc">
            Engineered from edge to cloud to maximize plant vitality and conserve water autonomously.
          </p>
        </div>

        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-card__icon">
              <Camera size={24} />
            </div>
            <h4 className="feature-card__title">Plant Identification</h4>
            <p className="feature-card__desc">
              Automatic botanical taxonomy identification via PlantNet API with dual-pass Groq Vision fallback and ambiguity gating.
            </p>
            <span className="feature-card__tag">PlantNet API</span>
          </div>

          <div className="feature-card">
            <div className="feature-card__icon">
              <Cpu size={24} />
            </div>
            <h4 className="feature-card__title">AI Irrigation Decisions</h4>
            <p className="feature-card__desc">
              Llama-3-70b-powered reasoning on Groq evaluating moisture trends, live weather forecasts, and species-specific hydration needs.
            </p>
            <span className="feature-card__tag">Groq Llama-3</span>
          </div>

          <div className="feature-card">
            <div className="feature-card__icon">
              <Activity size={24} />
            </div>
            <h4 className="feature-card__title">Real-time Monitoring</h4>
            <p className="feature-card__desc">
              Continuous 5-second polling of soil moisture percentages, ambient temperature, and relative humidity with sensor staleness detection.
            </p>
            <span className="feature-card__tag">Edge Telemetry</span>
          </div>

          <div className="feature-card">
            <div className="feature-card__icon">
              <Droplets size={24} />
            </div>
            <h4 className="feature-card__title">Automated Pump Control</h4>
            <p className="feature-card__desc">
              Hardware relay activation via ESP32 GPIO 33 with a mandatory 10-minute soaking cooldown preventing over-saturation.
            </p>
            <span className="feature-card__tag">ESP32 Relay</span>
          </div>

          <div className="feature-card">
            <div className="feature-card__icon">
              <ShieldCheck size={24} />
            </div>
            <h4 className="feature-card__title">Multi-user Isolation</h4>
            <p className="feature-card__desc">
              Per-user data partitioning with bcrypt password hashing and cryptographic JWT tokens securing individual botanical profiles.
            </p>
            <span className="feature-card__tag">JWT + SQLite</span>
          </div>

          <div className="feature-card">
            <div className="feature-card__icon">
              <History size={24} />
            </div>
            <h4 className="feature-card__title">History & Analytics</h4>
            <p className="feature-card__desc">
              Detailed chronological timeline recording sensor metrics, AI reasoning summaries, and exact pulse duration history.
            </p>
            <span className="feature-card__tag">Decision Log</span>
          </div>
        </div>
      </section>

      {/* System Architecture Diagram */}
      <section className="landing-section">
        <div className="section-header">
          <h3 className="section-header__title">System Architecture</h3>
          <p className="section-header__desc">
            Seamless closed-loop control from botanical sensing to intelligent actuation.
          </p>
        </div>

        <div className="architecture-container">
          {/* Flow Diagram */}
          <div className="arch-flow">
            <div className="arch-node">
              <div className="arch-node__icon">🌱</div>
              <div className="arch-node__title">Plant</div>
              <div className="arch-node__sub">Specimen</div>
            </div>
            <div className="arch-arrow">→</div>
            <div className="arch-node">
              <div className="arch-node__icon">📷</div>
              <div className="arch-node__title">Camera</div>
              <div className="arch-node__sub">BioLens Capture</div>
            </div>
            <div className="arch-arrow">→</div>
            <div className="arch-node">
              <div className="arch-node__icon">🔬</div>
              <div className="arch-node__title">PlantNet API</div>
              <div className="arch-node__sub">Botanical Match</div>
            </div>
            <div className="arch-arrow">→</div>
            <div className="arch-node">
              <div className="arch-node__icon">🧠</div>
              <div className="arch-node__title">Groq AI</div>
              <div className="arch-node__sub">LLM Inference</div>
            </div>
            <div className="arch-arrow">→</div>
            <div className="arch-node">
              <div className="arch-node__icon">📋</div>
              <div className="arch-node__title">Irrigation Decision</div>
              <div className="arch-node__sub">Deterministic Gate</div>
            </div>
            <div className="arch-arrow">→</div>
            <div className="arch-node">
              <div className="arch-node__icon">💧</div>
              <div className="arch-node__title">Pump</div>
              <div className="arch-node__sub">Relay Pulse</div>
            </div>
          </div>

          {/* Architecture Layers */}
          <div className="arch-layers">
            <div className="arch-layer arch-layer--hardware">
              <span className="arch-layer__badge">Hardware Layer</span>
              <div className="arch-layer__title">ESP32 Edge Controller</div>
              <p className="arch-layer__desc">
                Reads capacitive soil sensor & DHT11, executes 10-minute offline failsafe cooldown, and controls 12V submersible pump relay on GPIO 33.
              </p>
            </div>

            <div className="arch-layer arch-layer--backend">
              <span className="arch-layer__badge">Backend Layer</span>
              <div className="arch-layer__title">FastAPI & SQLite Engine</div>
              <p className="arch-layer__desc">
                Coordinates PlantNet, OpenWeatherMap, and Groq LLM pipelines. Enforces user authentication, per-user data isolation, and audit histories.
              </p>
            </div>

            <div className="arch-layer arch-layer--frontend">
              <span className="arch-layer__badge">Frontend Layer</span>
              <div className="arch-layer__title">React Dashboard</div>
              <p className="arch-layer__desc">
                Real-time digital twin visualization with 5-second background polling, sensor staleness alerts (90s threshold), and camera identification.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Hardware Showcase */}
      <section className="landing-section">
        <div className="section-header">
          <h3 className="section-header__title">Hardware Showcase</h3>
          <p className="section-header__desc">
            Industrial-grade components integrated for reliable 24/7 edge operation.
          </p>
        </div>

        <div className="hardware-grid">
          <div className="hardware-card">
            <h4 style={{ margin: '0 0 8px', fontSize: '18px', color: 'var(--color-botanical, #35462e)' }}>
              Component Stack
            </h4>
            <p style={{ margin: '0 0 16px', fontSize: '14px', color: 'var(--color-text-secondary, #6b6350)' }}>
              Field-tested sensors and actuators connected to the dual-core ESP32 micro-controller.
            </p>
            <div className="comp-list">
              <div className="comp-item">
                <div className="comp-item__icon"><Radio size={18} /></div>
                <div className="comp-item__name">ESP32 Microcontroller</div>
              </div>
              <div className="comp-item">
                <div className="comp-item__icon"><Activity size={18} /></div>
                <div className="comp-item__name">DHT11 Temp & Humidity</div>
              </div>
              <div className="comp-item">
                <div className="comp-item__icon"><Droplets size={18} /></div>
                <div className="comp-item__name">Capacitive Soil Sensor</div>
              </div>
              <div className="comp-item">
                <div className="comp-item__icon"><Zap size={18} /></div>
                <div className="comp-item__name">1-Channel Relay Module</div>
              </div>
              <div className="comp-item">
                <div className="comp-item__icon"><Droplets size={18} /></div>
                <div className="comp-item__name">12V DC Submersible Pump</div>
              </div>
            </div>
          </div>

          <div className="hardware-card">
            <h4 style={{ margin: '0 0 8px', fontSize: '18px', color: 'var(--color-botanical, #35462e)' }}>
              Operational Specifications
            </h4>
            <div className="specs-list">
              <div className="spec-item">
                <span className="spec-item__label">Dashboard Polling Rate</span>
                <span className="spec-item__value">5 seconds</span>
              </div>
              <div className="spec-item">
                <span className="spec-item__label">Hardware Telemetry Cycle</span>
                <span className="spec-item__value">30 seconds</span>
              </div>
              <div className="spec-item">
                <span className="spec-item__label">Pump Relay Pin</span>
                <span className="spec-item__value">GPIO 33</span>
              </div>
              <div className="spec-item">
                <span className="spec-item__label">Failsafe Cooldown</span>
                <span className="spec-item__value">10 minutes</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-credits">
          <strong>Smart India Hackathon 2026</strong> | Team stdIO.H
        </div>
        <div className="footer-links">
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="footer-link"
          >
            <span>GitHub Repository</span>
            <ExternalLink size={14} />
          </a>
        </div>
      </footer>
    </div>
  );
}
