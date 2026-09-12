import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { LogIn, AlertCircle, ArrowLeft, Zap } from 'lucide-react';
import logo from '../assets/bioagent-logo.jpeg';
import './Auth.css';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Please provide both username and password');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await login(username.trim(), password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <img src={logo} alt="BioAgent AI" className="auth-logo" />
          <h1 className="auth-title">Welcome Back</h1>
          <p className="auth-subtitle">Sign in to your BioAgent AI account</p>
        </div>

        {error && (
          <div className="auth-error-banner">
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="username">
              Username
            </label>
            <input
              id="username"
              type="text"
              className="form-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. demo"
              autoComplete="username"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </div>

          <button
            type="submit"
            className="auth-submit-btn"
            disabled={submitting}
            id="login-submit-btn"
          >
            <LogIn size={18} />
            <span>{submitting ? 'Authenticating...' : 'Sign In'}</span>
          </button>
        </form>

        <div className="auth-divider">or explore</div>

        <Link
          to="/demo"
          className="btn-live-demo"
          style={{
            width: '100%',
            justifyContent: 'center',
            padding: '11px 20px',
            fontSize: '14px',
            boxSizing: 'border-box',
          }}
        >
          <Zap size={16} />
          <span>Launch Instant Live Demo</span>
        </Link>

        <div className="auth-footer-nav">
          Don't have an account?
          <Link to="/signup" className="auth-link">
            Create account
          </Link>
        </div>

        <Link to="/" className="auth-back-link">
          <ArrowLeft size={14} />
          Back to Landing Page
        </Link>
      </div>
    </div>
  );
}
