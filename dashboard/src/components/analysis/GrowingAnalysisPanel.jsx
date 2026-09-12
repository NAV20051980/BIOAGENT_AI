import { useState, useEffect } from 'react';
import { AlertTriangle, Droplets, Activity, Zap, Play } from 'lucide-react';
import { useBioAgent } from '../../context/BioAgentContext.jsx';
import MoistureSparkline from '../charts/MoistureSparkline.jsx';
import './GrowingAnalysisPanel.css';

export default function GrowingAnalysisPanel({ plant, telemetry, weather, decision }) {
  const { handleActivatePump, telemetryHistory } = useBioAgent();
  const [now, setNow] = useState(Date.now());
  const [activating, setActivating] = useState(false);

  // 1-second ticker to track elapsed time for stale sensor warning & pump timers
  useEffect(() => {
    const ticker = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(ticker);
  }, []);

  // Determine timestamp of the latest sensor reading / decision
  const decisionTs = decision?.timestamp
    ? (decision.timestamp > 1e11 ? decision.timestamp : decision.timestamp * 1000)
    : (telemetry?.timestamp ? (telemetry.timestamp > 1e11 ? telemetry.timestamp : telemetry.timestamp * 1000) : now);

  const elapsedMs = Math.max(0, now - decisionTs);
  const isStale = elapsedMs > 90000;
  const elapsedSec = Math.floor(elapsedMs / 1000);

  const isPumpActive = Boolean(decision?.trigger_pump || decision?.decision === 'WATER');
  const durationSec = decision?.duration_sec ?? 5;
  const currentMoisture = Math.round(telemetry?.soilMoisture ?? telemetry?.soil_moisture_pct ?? 45);

  const idealMin = plant?.idealMoistureMin ?? 40;
  const idealMax = plant?.idealMoistureMax ?? 60;

  const handleManualPump = async () => {
    try {
      setActivating(true);
      await handleActivatePump({
        duration_sec: durationSec,
        reason: 'Manual pump activation requested via dashboard',
        soil_moisture: currentMoisture,
      });
    } catch (err) {
      console.warn('Manual pump activation error:', err);
    } finally {
      setActivating(false);
    }
  };

  const stats = [
    { label: 'Soil Moisture', value: `${currentMoisture}%` },
    { label: 'Temp', value: `${Math.round(telemetry?.temperature ?? telemetry?.temperature_c ?? 24)}\u00b0C` },
    {
      label: 'Rain Prob',
      value: weather?.rainProbability !== null && weather?.rainProbability !== undefined
        ? `${Math.round(weather.rainProbability)}%`
        : (weather?.max_rain_probability_pct !== null && weather?.max_rain_probability_pct !== undefined
          ? `${Math.round(weather.max_rain_probability_pct)}%`
          : 'N/A'),
    },
  ];

  const decisionStateClass = isPumpActive ? 'water' : 'no_watering';

  return (
    <div className="analysis-panel">
      {/* Stale Sensor Data Warning Banner (Amber: > 90s threshold) */}
      {isStale && (
        <div
          className="stale-sensor-warning-banner"
          style={{
            width: '88%',
            background: 'rgba(250, 173, 20, 0.12)',
            border: '1px solid rgba(250, 173, 20, 0.4)',
            color: '#d46b08',
            padding: '8px 14px',
            borderRadius: 'var(--radius-sm, 8px)',
            fontSize: '12px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '12px',
            boxSizing: 'border-box',
          }}
          role="alert"
        >
          <AlertTriangle size={15} style={{ flexShrink: 0 }} />
          <span>⚠️ Sensor data is stale (last update {elapsedSec}s ago)</span>
        </div>
      )}

      {/* TOP SECTION: Joined AI Decision, Moisture Sparkline & Stats Card */}
      <div className="analysis-panel__top">
        <div className={`analysis-panel__top-card analysis-panel__top-card--${decisionStateClass}`}>
          
          <div className="analysis-panel__decision">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '4px' }}>
              <span className="analysis-panel__decision-label">AI Decision</span>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: '999px',
                  background: isPumpActive ? '#e6f7ff' : '#f5f5f5',
                  color: isPumpActive ? '#0958d9' : '#8c8c8c',
                  border: isPumpActive ? '1px solid #91caff' : '1px solid #d9d9d9',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                {isPumpActive ? (
                  <>
                    <Droplets size={11} color="#0958d9" />
                    <span>Pump Active ({durationSec}s)</span>
                  </>
                ) : (
                  <>
                    <Activity size={11} color="#8c8c8c" />
                    <span>Pump Idle</span>
                  </>
                )}
              </span>
            </div>
            
            <span className="analysis-panel__decision-value">
              {decision?.decision || (isPumpActive ? 'WATER' : 'DO NOT WATER')}
            </span>
            <p className="analysis-panel__decision-reason">
              {decision?.reason || 'Continuous autonomous telemetry analysis.'}
            </p>

            {/* Manual Pump Control Override in Decision Section */}
            <button
              onClick={handleManualPump}
              disabled={activating || isPumpActive}
              style={{
                marginTop: '8px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                fontSize: '11.5px',
                fontWeight: 600,
                borderRadius: '8px',
                background: isPumpActive ? '#bae0ff' : 'var(--color-botanical, #35462e)',
                color: isPumpActive ? '#0958d9' : '#fffdf8',
                border: 'none',
                cursor: isPumpActive ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
              }}
              title="Trigger immediate AI evaluation and pump pulse"
            >
              {isPumpActive ? (
                <>
                  <Zap size={13} />
                  <span>Irrigation Running...</span>
                </>
              ) : (
                <>
                  <Play size={12} />
                  <span>{activating ? 'Evaluating...' : 'Trigger Pump Pulse'}</span>
                </>
              )}
            </button>
          </div>

          <div className="analysis-panel__card-divider" aria-hidden="true" />

          {/* Moisture Sparkline Chart */}
          <div style={{ padding: '10px 20px 6px' }}>
            <MoistureSparkline
              data={telemetryHistory}
              currentMoisture={currentMoisture}
              idealMin={idealMin}
              idealMax={idealMax}
              showLabel={true}
            />
          </div>

          <div className="analysis-panel__card-divider" aria-hidden="true" />

          <div className="analysis-panel__stats">
            {stats.map((stat) => (
              <div className="analysis-panel__stat" key={stat.label}>
                <span className="analysis-panel__stat-label">{stat.label}</span>
                <span className="analysis-panel__stat-value">{stat.value}</span>
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* HORIZONTAL INTERSECTION */}
      <div className="analysis-panel__divider" aria-hidden="true" />

      {/* BOTTOM SECTION: The Graphs */}
      <div className="analysis-panel__bottom">
        <div className="analysis-panel__graphs">
          
          {/* Moisture Graph */}
          <div className="analysis-panel__graph-container">
            <p className="analysis-panel__graph-title">Moisture Trend</p>
            <div className="analysis-panel__graph-placeholder">
              <svg viewBox="0 0 100 40" className="analysis-panel__graph-svg" preserveAspectRatio="none">
                <g className="analysis-panel__graph-grid">
                  <line x1="0" y1="10" x2="100" y2="10" />
                  <line x1="0" y1="20" x2="100" y2="20" />
                  <line x1="0" y1="30" x2="100" y2="30" />
                  <line x1="25" y1="0" x2="25" y2="40" />
                  <line x1="50" y1="0" x2="50" y2="40" />
                  <line x1="75" y1="0" x2="75" y2="40" />
                </g>
                <path d="M0,35 Q15,5 30,25 T60,15 T100,20" fill="none" stroke="#94550e" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          {/* Humidity Graph */}
          <div className="analysis-panel__graph-container">
            <p className="analysis-panel__graph-title">Humidity Trend</p>
            <div className="analysis-panel__graph-placeholder">
              <svg viewBox="0 0 100 40" className="analysis-panel__graph-svg" preserveAspectRatio="none">
                <g className="analysis-panel__graph-grid">
                  <line x1="0" y1="10" x2="100" y2="10" />
                  <line x1="0" y1="20" x2="100" y2="20" />
                  <line x1="0" y1="30" x2="100" y2="30" />
                  <line x1="25" y1="0" x2="25" y2="40" />
                  <line x1="50" y1="0" x2="50" y2="40" />
                  <line x1="75" y1="0" x2="75" y2="40" />
                </g>
                <path d="M0,30 Q20,10 40,20 T80,10 T100,15" fill="none" stroke="#0068ff" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}