import { useState, useEffect } from 'react';
import { Bell, Droplets, Sprout, ShieldCheck, Mail, Calendar, Sparkles } from 'lucide-react';
import Panel from '../components/common/Panel.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useBioAgent } from '../context/BioAgentContext.jsx';
import { API_BASE_URL, getToken } from '../api.js';
import './Profile.css';

const PREFERENCE_TOGGLES = [
  { key: 'wateringAlerts', label: 'Watering alerts', description: 'Notify when BioAgent triggers irrigation.' },
  { key: 'weeklyDigest', label: 'Weekly digest', description: 'A weekly summary of plant health and history.' },
  { key: 'rainHold', label: 'Hold watering before rain', description: 'Let BioAgent skip watering when rain is forecast.' },
];

export default function Profile() {
  const { user } = useAuth();
  const { userPlants } = useBioAgent();

  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [autoIrrigation, setAutoIrrigation] = useState(true);
  const [preferences, setPreferences] = useState({
    wateringAlerts: true,
    weeklyDigest: false,
    rainHold: true,
  });

  // Fetch real user data from GET /user-profile or /api/user-profile
  useEffect(() => {
    let mounted = true;

    async function fetchUserProfile() {
      setLoading(true);
      try {
        const token = getToken();
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        let res;
        try {
          res = await fetch(`${API_BASE_URL}/user-profile`, { headers });
        } catch {
          res = await fetch(`${API_BASE_URL}/api/user-profile`, { headers });
        }

        if (res && res.ok) {
          const data = await res.json();
          if (mounted) {
            setProfileData(data);
            if (data.auto_irrigation_enabled !== undefined) {
              setAutoIrrigation(Boolean(data.auto_irrigation_enabled));
            }
          }
        } else {
          // Fallback to fetching /user-plants if /user-profile is unavailable
          const plantsRes = await fetch(`${API_BASE_URL}/user-plants`, { headers });
          if (plantsRes && plantsRes.ok) {
            const plantsData = await plantsRes.json();
            const list = Array.isArray(plantsData) ? plantsData : (plantsData.plants || []);
            if (mounted) {
              setProfileData({
                username: user?.username || 'User',
                email: user?.email || '',
                total_plants: list.length,
                created_at: null,
                auto_irrigation_enabled: true,
              });
            }
          }
        }
      } catch (err) {
        console.warn('Could not fetch user profile:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchUserProfile();

    return () => {
      mounted = false;
    };
  }, [user]);

  function togglePreference(key) {
    setPreferences((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  // Derive username, initials, plant count, and creation date
  const username = profileData?.username || user?.username || 'User';
  const email = profileData?.email || user?.email || '';
  const userInitials = (username.trim().slice(0, 2) || 'US').toUpperCase();

  // Total plants count: dynamically sync with userPlants if updated via BioLens
  const totalPlants = userPlants && userPlants.length !== undefined && userPlants.length > 0
    ? userPlants.length
    : (profileData?.total_plants ?? (userPlants ? userPlants.length : 0));

  // Date formatting for "Growing with BioAgent since..."
  let sinceText = 'recently';
  if (profileData?.created_at) {
    try {
      const d = new Date(profileData.created_at);
      if (!isNaN(d.getTime())) {
        sinceText = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }
    } catch {
      sinceText = 'recently';
    }
  }

  return (
    <div className="profile-page">
      <header className="profile-page__header">
        <h1>Profile</h1>
        <p>Manage your BioAgent account settings, connected plants, and autonomous irrigation preferences.</p>
      </header>

      <div className="profile-page__row">
        {/* Profile Card */}
        <Panel className="profile-page__card">
          <div className="profile-page__avatar" aria-hidden="true" title={`User initials: ${userInitials}`}>
            {userInitials}
          </div>

          <h2 className="profile-page__name">{username}</h2>
          <p className="profile-page__role">Plant Parent</p>
          <p className="profile-page__since">Growing with BioAgent since {sinceText}</p>

          <div className="profile-page__summary-pill">
            <span>
              <strong>{totalPlants}</strong> {totalPlants === 1 ? 'Plant' : 'Plants'}
            </span>
            <span className="pill-dot">·</span>
            <span className={autoIrrigation ? 'color-active' : 'color-inactive'}>
              Auto-irrigation {autoIrrigation ? 'enabled' : 'disabled'}
            </span>
          </div>

          <div className="profile-page__stats">
            <div className="profile-stat-box">
              <Sprout size={16} strokeWidth={1.75} aria-hidden="true" />
              <span className="profile-stat-val">{totalPlants} {totalPlants === 1 ? 'Plant' : 'Plants'}</span>
            </div>
            <div
              className="profile-stat-box"
              style={{ cursor: 'pointer' }}
              onClick={() => setAutoIrrigation(!autoIrrigation)}
              title="Click to toggle auto-irrigation"
            >
              <Droplets size={16} strokeWidth={1.75} aria-hidden="true" />
              <span className="profile-stat-val">
                {autoIrrigation ? 'Auto-irrigation ON' : 'Auto-irrigation OFF'}
              </span>
            </div>
          </div>
        </Panel>

        {/* Preferences Section */}
        <Panel className="profile-page__preferences">
          <div className="profile-page__pref-header">
            <p className="profile-page__eyebrow">Preferences</p>
            <span className="profile-page__account-email" title="Account Email">
              <Mail size={13} />
              {email || `${username}@bioagent.local`}
            </span>
          </div>

          <ul className="profile-page__toggle-list">
            {/* Auto-Irrigation Master Toggle */}
            <li className="profile-page__toggle-row">
              <div>
                <p className="profile-page__toggle-label">
                  <Droplets size={14} strokeWidth={2} color="#0958d9" aria-hidden="true" />
                  Auto-irrigation
                </p>
                <p className="profile-page__toggle-description">
                  Allow ESP32 edge relay to autonomously pulse irrigation based on Groq AI decisions.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={autoIrrigation}
                className={`profile-page__switch${autoIrrigation ? ' profile-page__switch--on' : ''}`}
                onClick={() => setAutoIrrigation(!autoIrrigation)}
                title="Toggle Auto-irrigation"
              >
                <span className="profile-page__switch-thumb" />
              </button>
            </li>

            {/* Configured Notification & Rule Toggles */}
            {PREFERENCE_TOGGLES.map((item) => (
              <li className="profile-page__toggle-row" key={item.key}>
                <div>
                  <p className="profile-page__toggle-label">
                    <Bell size={14} strokeWidth={2} aria-hidden="true" />
                    {item.label}
                  </p>
                  <p className="profile-page__toggle-description">{item.description}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={preferences[item.key]}
                  className={`profile-page__switch${preferences[item.key] ? ' profile-page__switch--on' : ''}`}
                  onClick={() => togglePreference(item.key)}
                  title={`Toggle ${item.label}`}
                >
                  <span className="profile-page__switch-thumb" />
                </button>
              </li>
            ))}
          </ul>

          <p className="profile-page__disclaimer">
            Preferences and safety thresholds are bound to your account profile.
          </p>
        </Panel>
      </div>
    </div>
  );
}
