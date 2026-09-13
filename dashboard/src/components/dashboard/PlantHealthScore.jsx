import React, { useEffect, useState } from 'react';
import {
  Activity,
  Droplets,
  Thermometer,
  Wind,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  Leaf,
  Image as ImageIcon,
} from 'lucide-react';
import './PlantHealthScore.css';

/**
 * PlantHealthScore Component
 * Modern, high-contrast, cohesive plant health visualizer with circular SVG gauge,
 * robust image fallback, trend indicators, and 4-stat breakdown mini-cards.
 */
export default function PlantHealthScore({ plantId, activePlant }) {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [imageError, setImageError] = useState(false);
  const [localUploadedImage, setLocalUploadedImage] = useState(null);
  const [analyzingImage, setAnalyzingImage] = useState(false);
  const fileInputRef = React.useRef(null);

  useEffect(() => {
    setImageError(false);
    setLocalUploadedImage(null);
  }, [plantId, activePlant]);

  useEffect(() => {
    if (!plantId) {
      console.warn('PlantHealthScore: No plantId provided');
      setLoading(false);
      return;
    }

    const fetchHealth = async () => {
      try {
        setLoading(true);
        setError(null);

        const cleanId = String(plantId).replace('plant-', '');
        const token = localStorage.getItem('auth_token') || localStorage.getItem('bioagent_token');

        const response = await fetch(`/api/plant-health/${encodeURIComponent(cleanId || '1')}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          if (response.status >= 400 && response.status < 500) {
            throw new Error('Unable to analyze image. Please upload a clear JPG/PNG under 5MB.');
          }
          throw new Error('Plant health telemetry is temporarily unavailable.');
        }

        const data = await response.json();
        setHealthData(data);
      } catch (err) {
        console.error('Plant health fetch error:', err);
        const userMsg =
          err.message && err.message.includes('422')
            ? 'Unable to analyze image. Please upload a clear JPG/PNG under 5MB.'
            : err.message || 'Unable to analyze image. Please upload a clear JPG/PNG under 5MB.';
        setError(userMsg);
      } finally {
        setLoading(false);
      }
    };

    fetchHealth();
  }, [plantId]);

  // Handle direct file upload from the card
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side validation: Max 5MB & image types
    if (file.size > 5 * 1024 * 1024 || !file.type.startsWith('image/')) {
      setError('Unable to analyze image. Please upload a clear JPG/PNG under 5MB.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setError(null);
    setAnalyzingImage(true);

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result;
      setImageError(false);
      setLocalUploadedImage(dataUrl);
      localStorage.setItem('bioagent_plant_image_active', dataUrl);
      if (plantId) {
        localStorage.setItem(`bioagent_plant_image_${plantId}`, dataUrl);
      }
      if (activePlant) {
        activePlant.imageUrl = dataUrl;
        activePlant.image_url = dataUrl;
        activePlant.image = dataUrl;
      }

      // Backend health diagnostic analysis
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('image', file);
        if (plantId) {
          const cleanId = String(plantId).replace('plant-', '');
          formData.append('plant_id', cleanId);
        }

        const token = localStorage.getItem('auth_token') || localStorage.getItem('bioagent_token');
        const res = await fetch('/api/plant-health/upload', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        if (!res.ok) {
          if (res.status >= 400 && res.status < 500) {
            setError('Unable to analyze image. Please upload a clear JPG/PNG under 5MB.');
          } else {
            console.warn('Image health diagnostic returned status:', res.status);
          }
        } else {
          const data = await res.json();
          if (data && data.health_score !== undefined) {
            setHealthData(data);
          }
          setError(null);
        }
      } catch (err) {
        console.warn('Image analysis network error:', err);
      } finally {
        setAnalyzingImage(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  // Robust image validation: never render raw HTTP strings or broken image icons
  const storedPlantImage = plantId ? localStorage.getItem(`bioagent_plant_image_${plantId}`) : null;
  const storedActiveImage = localStorage.getItem('bioagent_plant_image_active');

  const imageUrl =
    localUploadedImage ||
    activePlant?.imageUrl ||
    activePlant?.image_url ||
    activePlant?.image ||
    activePlant?.photo_url ||
    healthData?.imageUrl ||
    healthData?.image_url ||
    healthData?.image ||
    storedPlantImage ||
    storedActiveImage ||
    null;

  const hasValidImage =
    Boolean(imageUrl) &&
    typeof imageUrl === 'string' &&
    imageUrl.trim() !== '' &&
    !imageError &&
    !imageUrl.startsWith('http://localhost:5173/null') &&
    imageUrl !== 'null' &&
    imageUrl !== 'undefined';

  if (loading || analyzingImage) {
    return (
      <div className="plant-health-card plant-health-card--state">
        <div className="plant-health-spinner" />
        <span className="plant-health-state-text">
          {analyzingImage ? 'Analyzing specimen with AI diagnostics…' : 'Calculating plant health score…'}
        </span>
      </div>
    );
  }

  if (error && !healthData) {
    return (
      <div className="plant-health-card plant-health-card--state">
        <AlertTriangle size={24} className="plant-health-state-icon plant-health-state-icon--warning" />
        <div className="plant-health-state-text">
          <strong>Visual Analysis Notice</strong>
          <span>{error}</span>
        </div>
      </div>
    );
  }

  if (!healthData) return null;

  const { health_score = 0, trend = 'stable', components = {} } = healthData;
  const score = Math.round(Number(health_score) || 0);

  // Dynamic status evaluation
  let healthTheme = {
    color: '#2e7d32',
    trackBg: '#e2f0d9',
    label: 'Optimal Health',
    badgeBg: '#eaf5ea',
    badgeBorder: '#c8e6c9',
    badgeColor: '#2e7d32',
  };

  if (score < 50) {
    healthTheme = {
      color: '#c62828',
      trackBg: '#fbe9e7',
      label: 'Critical Condition',
      badgeBg: '#ffebee',
      badgeBorder: '#ffcdd2',
      badgeColor: '#c62828',
    };
  } else if (score < 75) {
    healthTheme = {
      color: '#d4722a',
      trackBg: '#fff3e0',
      label: 'Moderate / Attention',
      badgeBg: '#fff8e1',
      badgeBorder: '#ffe082',
      badgeColor: '#b78103',
    };
  }

  // Trend config
  const trendConfig = {
    improving: { label: 'Improving', icon: TrendingUp, color: '#2e7d32', bg: '#e8f5e9' },
    stable: { label: 'Stable', icon: Minus, color: '#6d4c41', bg: '#efebe9' },
    declining: { label: 'Declining', icon: TrendingDown, color: '#c62828', bg: '#ffebee' },
    new: { label: 'New Telemetry', icon: Sparkles, color: '#1565c0', bg: '#e3f2fd' },
  }[trend.toLowerCase()] || { label: trend, icon: Sparkles, color: '#666', bg: '#f5f5f5' };

  const TrendIcon = trendConfig.icon;

  // Stat mini-cards configuration
  const statItems = [
    {
      id: 'moisture',
      title: 'Moisture Match',
      value: components.moisture != null ? `${Number(components.moisture).toFixed(1)}%` : '—',
      raw: components.moisture || 0,
      icon: Droplets,
      iconColor: '#1976d2',
    },
    {
      id: 'temperature',
      title: 'Temperature',
      value: components.temperature != null ? `${Number(components.temperature).toFixed(1)}%` : '—',
      raw: components.temperature || 0,
      icon: Thermometer,
      iconColor: '#e65100',
    },
    {
      id: 'humidity',
      title: 'Humidity Level',
      value: components.humidity != null ? `${Number(components.humidity).toFixed(1)}%` : '—',
      raw: components.humidity || 0,
      icon: Wind,
      iconColor: '#00897b',
    },
    {
      id: 'watering',
      title: 'Watering Regularity',
      value: components.watering != null ? `${Number(components.watering).toFixed(1)}%` : '—',
      raw: components.watering || 0,
      icon: CheckCircle2,
      iconColor: '#5a8a3a',
    },
  ];

  return (
    <div className="plant-health-card">
      {/* Header with Title & Specimen Identity */}
      <div className="plant-health-header">
        <div className="plant-health-header__title-group">
          <div className="plant-health-icon-bubble">
            <Activity size={18} />
          </div>
          <div>
            <h3 className="plant-health-title">Plant Health & Vitality</h3>
            <span className="plant-health-subtitle">
              {activePlant?.species || activePlant?.name || 'Active Specimen'}
              {activePlant?.scientific_name && (
                <em className="plant-health-scientific"> · {activePlant.scientific_name}</em>
              )}
            </span>
          </div>
        </div>

        {/* Trend Badge */}
        <div
          className="plant-health-trend-badge"
          style={{
            backgroundColor: trendConfig.bg,
            color: trendConfig.color,
            borderColor: `${trendConfig.color}40`,
          }}
        >
          <TrendIcon size={14} />
          <span>{trendConfig.label}</span>
        </div>
      </div>

      {/* Hero Visual Section: Circular Progress Gauge + Specimen Image / Placeholder */}
      <div className="plant-health-hero">
        {/* Circular Progress Gauge */}
        <div className="plant-health-gauge-box">
          <svg viewBox="0 0 100 100" className="plant-health-svg-gauge">
            {/* Background track */}
            <circle
              cx="50"
              cy="50"
              r="40"
              className="plant-health-gauge-track"
            />
            {/* Dynamic Progress Circle */}
            <circle
              cx="50"
              cy="50"
              r="40"
              className="plant-health-gauge-fill"
              style={{
                stroke: healthTheme.color,
                strokeDasharray: `${(score / 100) * 251.3} 251.3`,
              }}
            />
          </svg>
          <div className="plant-health-gauge-content">
            <span className="plant-health-gauge-value" style={{ color: healthTheme.color }}>
              {score}
              <span className="plant-health-gauge-pct">%</span>
            </span>
            <span className="plant-health-gauge-label" style={{ color: healthTheme.color }}>
              {healthTheme.label}
            </span>
          </div>
        </div>

        {/* Specimen Visual Attachment / Graceful Placeholder */}
        <div className="plant-health-attachment">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageUpload}
            accept="image/*"
            style={{ display: 'none' }}
          />
          {hasValidImage ? (
            <div
              className="plant-health-image-container"
              onClick={() => fileInputRef.current?.click()}
              title="Click to change specimen image"
              style={{ cursor: 'pointer' }}
            >
              <img
                src={imageUrl}
                alt={activePlant?.species || 'Plant photo'}
                className="plant-health-image"
                onError={() => setImageError(true)}
              />
              <span className="plant-health-image-tag">Specimen Scan</span>
            </div>
          ) : (
            <div
              className="plant-health-no-image"
              onClick={() => fileInputRef.current?.click()}
              title="Click to upload specimen image"
              style={{ cursor: 'pointer' }}
            >
              <div className="plant-health-no-image__icon">
                <Leaf size={22} style={{ color: '#8c7355' }} />
              </div>
              <span className="plant-health-no-image__title">No Image Attached</span>
              <span className="plant-health-no-image__sub">Click to attach scan</span>
            </div>
          )}
        </div>
      </div>

      {/* Component Breakdown Mini-Cards (2x2 High-Contrast Grid) */}
      <div className="plant-health-stats-grid">
        {statItems.map((stat) => {
          const StatIcon = stat.icon;
          const statPct = Math.min(100, Math.max(0, Number(stat.raw) || 0));
          return (
            <div key={stat.id} className="plant-health-stat-card">
              <div className="plant-health-stat-card__top">
                <div className="plant-health-stat-card__icon" style={{ color: stat.iconColor, backgroundColor: `${stat.iconColor}15` }}>
                  <StatIcon size={14} />
                </div>
                <span className="plant-health-stat-card__title">{stat.title}</span>
              </div>
              <div className="plant-health-stat-card__bottom">
                <span className="plant-health-stat-card__value">{stat.value}</span>
                <div className="plant-health-stat-bar-track">
                  <div
                    className="plant-health-stat-bar-fill"
                    style={{
                      width: `${statPct}%`,
                      backgroundColor: stat.iconColor,
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

