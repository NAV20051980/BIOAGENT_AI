import React, { useEffect, useState } from 'react';
import { Droplets, Power, RefreshCcw, Server } from 'lucide-react';
import { useBioAgent } from '../../context/BioAgentContext.jsx';

const MetricCard = ({ title, value, icon: Icon, statusColor, subtext }) => {
  return (
    <div className="panel metric-card" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '14px 16px', width: '100%', minHeight: '90px' }}>
      <div 
        className="metric-card__icon" 
        style={{
          padding: '0.35rem',
          borderRadius: '50%',
          backgroundColor: statusColor || 'var(--accent-blue)',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {Icon && <Icon size={16} />}
      </div>
      <div className="metric-card__info">
        <span style={{ fontSize: '0.7rem', color: '#666', fontWeight: 500, margin: 0 }}>{title}</span>
        <h3 style={{ margin: '0.1rem 0', fontSize: '0.95rem', lineHeight: '1.1', color: 'var(--text-dark)' }}>{value}</h3>
        {subtext && <span style={{ color: '#888', fontSize: '0.65rem', margin: 0 }}>{subtext}</span>}
      </div>
    </div>
  );
};

const MetricCards = () => {
  const { latestTelemetry, latestDecision, backendStatus } = useBioAgent();
  const [moisture, setMoisture] = useState('45%');
  const [pumpStatus, setPumpStatus] = useState('IDLE');
  const [lastSync, setLastSync] = useState('—');
  const [systemStatus, setSystemStatus] = useState('UNKNOWN');

  useEffect(() => {
    if (latestTelemetry && typeof latestTelemetry.soilMoisture === 'number') {
      setMoisture(`${latestTelemetry.soilMoisture}%`);
    }
    if (latestDecision) {
      setPumpStatus(latestDecision.trigger_pump ? 'WATERING' : 'IDLE');
    }
    if (latestTelemetry && latestTelemetry.timestamp) {
      const date = new Date(latestTelemetry.timestamp);
      setLastSync(date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }
    if (backendStatus) {
      setSystemStatus(backendStatus.online ? 'ONLINE' : 'OFFLINE');
    }
  }, [latestTelemetry, latestDecision, backendStatus]);

  return (
    <div
      className="metric-cards-container"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '1rem',
        width: '100%',
        marginBottom: '1rem',
      }}
    >
      <MetricCard
        icon={RefreshCcw}
        statusColor="var(--accent-blue)"
        subtext="Recent"
        title="Last Sync"
        value={lastSync}
      />
      <MetricCard
        icon={Server}
        statusColor={backendStatus && backendStatus.online ? 'var(--green)' : 'var(--red)'}
        subtext="Backend"
        title="System Status"
        value={systemStatus}
      />
      <MetricCard
        icon={Droplets}
        statusColor="var(--accent-blue)"
        subtext="Optimal range"
        title="Moisture Status"
        value={moisture}
      />
      <MetricCard
        icon={Power}
        statusColor="var(--primary-brown)"
        subtext="System Standby"
        title="Pump Status"
        value={pumpStatus}
      />
    </div>
  );
};

export default MetricCards;
