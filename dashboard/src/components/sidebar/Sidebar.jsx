import { NavLink, useNavigate } from 'react-router-dom';
import { Home, LayoutDashboard, Camera, CloudSun, Info, User, LogOut, LogIn } from 'lucide-react';
import logo from '../../assets/bioagent-logo.jpeg';
import { useAuth } from '../../context/AuthContext.jsx';
import './Sidebar.css';

const primaryLinks = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/biolens', label: 'BioLens', icon: Camera },
  { to: '/weather', label: 'Weather', icon: CloudSun },
];

const secondaryLinks = [
  { to: '/about', label: 'About Us', icon: Info },
  { to: '/profile', label: 'Profile', icon: User },
];

function NavItem({ to, label, icon: Icon }) {
  return (
    <li>
      <NavLink
        to={to}
        className={({ isActive }) =>
          'sidebar__link' + (isActive ? ' sidebar__link--active' : '')
        }
      >
        <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
        <span className="sidebar__label">{label}</span>
      </NavLink>
    </li>
  );
}

export default function Sidebar() {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <aside className="sidebar">
      <NavLink to="/dashboard" className="sidebar__brand" aria-label="Go to Dashboard">
        <img src={logo} alt="BioAgent AI logo" className="sidebar__logo" />
        <span className="sidebar__brand-name">BioAgent AI</span>
      </NavLink>

      <nav className="sidebar__nav" aria-label="Primary">
        <ul>
          {primaryLinks.map((link) => (
            <NavItem key={link.to} {...link} />
          ))}
        </ul>
      </nav>

      <nav className="sidebar__nav sidebar__nav--secondary" aria-label="Secondary">
        <ul>
          {secondaryLinks.map((link) => (
            <NavItem key={link.to} {...link} />
          ))}
        </ul>
      </nav>

      {/* User Session & Logout Action */}
      <div
        style={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 4px 4px',
          borderTop: '1px solid var(--color-border)',
        }}
      >
        {isAuthenticated ? (
          <>
            <div
              style={{
                fontSize: '10.5px',
                fontWeight: 600,
                color: 'var(--color-botanical)',
                maxWidth: '80px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                textAlign: 'center',
                padding: '2px 6px',
                background: 'var(--color-surface-soft)',
                borderRadius: '6px',
              }}
              title={`Logged in as ${user?.username || 'User'}`}
            >
              {user?.username || 'User'}
            </div>
            <button
              onClick={handleLogout}
              className="sidebar__link"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                width: '100%',
                padding: '6px 4px',
              }}
              title="Log out and return to Home"
            >
              <LogOut size={18} strokeWidth={1.75} color="#cf1322" aria-hidden="true" />
              <span className="sidebar__label" style={{ color: '#cf1322' }}>Logout</span>
            </button>
          </>
        ) : (
          <NavLink
            to="/login"
            className="sidebar__link"
            style={{ width: '100%', padding: '6px 4px' }}
            title="Sign in to your account"
          >
            <LogIn size={18} strokeWidth={1.75} aria-hidden="true" />
            <span className="sidebar__label">Login</span>
          </NavLink>
        )}
      </div>
    </aside>
  );
}
