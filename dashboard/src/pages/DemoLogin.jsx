import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Zap, AlertCircle, ArrowLeft, RefreshCw } from 'lucide-react';
import logo from '../assets/bioagent-logo.jpeg';

export default function DemoLogin() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [statusText, setStatusText] = useState('Initiating demo credentials...');
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function performDemoLogin() {
      try {
        setError(null);
        if (mounted) setStatusText('Authenticating as demo user (username: demo)...');
        await login('demo', 'demo123');
        if (mounted) {
          setStatusText('Authentication successful! Loading Bael profile & telemetry...');
          setTimeout(() => {
            if (mounted) navigate('/dashboard', { replace: true });
          }, 600);
        }
      } catch (err) {
        console.error('Demo auto-login failed:', err);
        if (mounted) {
          setError(err.message || 'Failed to auto-login to demo account. Please ensure backend is running.');
        }
      }
    }

    performDemoLogin();

    return () => {
      mounted = false;
    };
  }, [login, navigate]);

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--color-background, #f6f1e4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        fontFamily: 'var(--font-body, "Manrope", sans-serif)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          background: 'var(--color-surface, #fffdf8)',
          border: '1px solid var(--color-border, #e1d5b8)',
          borderRadius: 'var(--radius-lg, 24px)',
          padding: '40px 32px',
          textAlign: 'center',
          boxShadow: 'var(--shadow-elevated)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '20px',
        }}
      >
        <img
          src={logo}
          alt="BioAgent AI"
          style={{ width: '64px', height: '64px', borderRadius: '16px', objectFit: 'cover' }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-botanical, #35462e)' }}>
          <Zap size={20} color="#2e7d32" />
          <h2 style={{ fontFamily: 'var(--font-display, "Fraunces", serif)', margin: 0, fontSize: '24px' }}>
            Live Demo Access
          </h2>
        </div>

        {!error ? (
          <>
            <div
              style={{
                width: '48px',
                height: '48px',
                border: '3px solid #e1d5b8',
                borderTopColor: '#2e7d32',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
                margin: '12px 0',
              }}
            />
            <p style={{ color: 'var(--color-text-secondary, #6b6350)', fontSize: '14px', margin: 0 }}>
              {statusText}
            </p>
            <span style={{ fontSize: '12px', color: '#93a382' }}>
              Redirecting to autonomous dashboard...
            </span>
          </>
        ) : (
          <div
            style={{
              background: '#fff1f0',
              border: '1px solid #ffa39e',
              borderRadius: '12px',
              padding: '16px',
              width: '100%',
              textAlign: 'left',
              marginTop: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#cf1322', fontWeight: 600, fontSize: '14px', marginBottom: '6px' }}>
              <AlertCircle size={16} />
              <span>Demo Login Error</span>
            </div>
            <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#595959' }}>
              {error}
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <Link
                to="/login"
                style={{
                  flex: 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '9px 12px',
                  background: '#ffffff',
                  border: '1px solid #d9d9d9',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#262626',
                  textDecoration: 'none',
                }}
              >
                Go to Login
              </Link>
              <button
                onClick={() => window.location.reload()}
                style={{
                  flex: 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '9px 12px',
                  background: '#2e7d32',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#ffffff',
                  cursor: 'pointer',
                }}
              >
                <RefreshCw size={14} />
                Retry
              </button>
            </div>
          </div>
        )}

        <Link
          to="/"
          style={{
            marginTop: '8px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            color: 'var(--color-olive, #6e7a4e)',
            fontSize: '13px',
            textDecoration: 'none',
          }}
        >
          <ArrowLeft size={14} />
          Back to Landing Page
        </Link>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
