import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { UserPlus, AlertCircle, ArrowLeft } from 'lucide-react';
import logo from '../assets/bioagent-logo.jpeg';
import './Auth.css';

export default function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !email.trim() || !password) {
      setError('Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await signup(username.trim(), email.trim(), password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Registration failed. Username or email may already be taken.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <img src={logo} alt="BioAgent AI" className="auth-logo" />
          <h1 className="auth-title">Create Account</h1>
          <p className="auth-subtitle">Join BioAgent AI to manage your botanical systems</p>
        </div>

        {error && (
          <div className="auth-error-banner">
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="signup-username">
              Username
            </label>
            <input
              id="signup-username"
              type="text"
              className="form-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. botanist_alex"
              autoComplete="username"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="signup-email">
              Email Address
            </label>
            <input
              id="signup-email"
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alex@example.com"
              autoComplete="email"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="signup-password">
              Password
            </label>
            <input
              id="signup-password"
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              autoComplete="new-password"
              required
            />
          </div>

          <button
            type="submit"
            className="auth-submit-btn"
            disabled={submitting}
            id="signup-submit-btn"
          >
            <UserPlus size={18} />
            <span>{submitting ? 'Creating Account...' : 'Register'}</span>
          </button>
        </form>

        <div className="auth-footer-nav">
          Already have an account?
          <Link to="/login" className="auth-link">
            Sign in
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
