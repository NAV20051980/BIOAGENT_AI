import { Activity, Droplets, CloudSun, Clock, CheckCircle2, AlertCircle, Zap } from 'lucide-react';
import './KPICards.css';

export default function KPICards({ backendStatus, telemetry, weather, decision, plant }) {
  const isOnline = backendStatus?.online ?? true;
  const totalDecisions = backendStatus?.total_decisions_logged ?? 0;
  
  const lastDecTs = backendStatus?.last_decision_at || decision?.timestamp;
  let formattedLastTime = 'Just now';
  if (lastDecTs) {
    const tsMs = lastDecTs > 1e11 ? lastDecTs : lastDecTs * 1000;
    formattedLastTime = new Date(tsMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  const moistureVal = Math.round(telemetry?.soilMoisture ?? telemetry?.soil_moisture_pct ?? 45);
  const tempVal = Math.round(telemetry?.temperature ?? telemetry?.temperature_c ?? 24);
  const humidityVal = Math.round(telemetry?.humidity ?? telemetry?.humidity_pct ?? 50);
  const rainProb = weather?.rainProbability !== null && weather?.rainProbability !== undefined
    ? `${Math.round(weather.rainProbability)}%`
    : (weather?.max_rain_probability_pct !== null && weather?.max_rain_probability_pct !== undefined
      ? `${Math.round(weather.max_rain_probability_pct)}%`
      : 'N/A');

  const idealMin = plant?.idealMoistureMin ?? 40;
  const idealMax = plant?.idealMoistureMax ?? 60;
  let moistureStatus = 'Optimal';
  let moistureColor = '#35462e';
  if (moistureVal < idealMin) {
    moistureStatus = 'Dry';
    moistureColor = '#c0402a';
  } else if (moistureVal > idealMax) {
    moistureStatus = 'Wet';
    moistureColor = '#0958d9';
  }

  const isPumpActive = Boolean(decision?.trigger_pump || decision?.decision === 'WATER');

  const cards = [
    {
      label: 'API Engine',
      value: isOnline ? 'Online' : 'Offline',
      status: isOnline ? 'FastAPI 8000' : 'Disconnected',
      statusColor: isOnline ? '#2e7d32' : '#cf1322',
      icon: isOnline ? <CheckCircle2 size={16} color="#2e7d32" /> : <AlertCircle size={16} color="#cf1322" />,
      accent: isOnline ? '#2e7d32' : '#cf1322',
    },
    {
      label: 'Total Decisions',
      value: `${totalDecisions}`,
      status: 'Deterministic AI',
      statusColor: '#6e7a4e',
      icon: <Activity size={16} color="#6e7a4e" />,
      accent: '#35462e',
    },
    {
      label: 'Last Sync',
      value: formattedLastTime,
      status: 'Cycle 5s Polling',
      statusColor: '#8c8c8c',
      icon: <Clock size={16} color="#8c8c8c" />,
      accent: '#595959',
    },
    {
      label: 'Soil Moisture',
      value: `${moistureVal}%`,
      status: `${moistureStatus} (${idealMin}-${idealMax}%)`,
      statusColor: moistureColor,
      icon: <Droplets size={16} color={moistureColor} />,
      accent: moistureColor,
    },
    {
      label: 'Temp / Humidity',
      value: `${tempVal}° / ${humidityVal}%`,
      status: 'Ambient Sensor',
      statusColor: '#6e7a4e',
      icon: <Activity size={16} color="#b87a2a" />,
      accent: '#b87a2a',
    },
    {
      label: 'Pump & Weather',
      value: isPumpActive ? 'PUMP ON' : 'PUMP IDLE',
      status: `Rain: ${rainProb}`,
      statusColor: isPumpActive ? '#0958d9' : '#6e7a4e',
      icon: isPumpActive ? <Zap size={16} color="#0958d9" /> : <CloudSun size={16} color="#6e7a4e" />,
      accent: isPumpActive ? '#0958d9' : '#35462e',
      glow: isPumpActive,
    },
  ];

  return (
    <div className="kpi-grid">
      {cards.map((c) => (
        <div
          key={c.label}
          className={`kpi-card ${c.glow ? 'kpi-card--glow' : ''}`}
        >
          <div className="kpi-card__header">
            <span className="kpi-card__label">{c.label}</span>
            <span className="kpi-card__icon">{c.icon}</span>
          </div>
          <div className="kpi-card__value" style={{ color: c.accent }}>
            {c.value}
          </div>
          <div className="kpi-card__footer">
            <span
              className="kpi-card__badge"
              style={{
                background: `${c.statusColor}14`,
                color: c.statusColor,
                borderColor: `${c.statusColor}30`,
              }}
            >
              {c.status}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
