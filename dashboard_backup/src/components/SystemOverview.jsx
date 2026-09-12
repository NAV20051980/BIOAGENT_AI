import React from 'react';
import { Droplets, Thermometer, Wind, Cpu, Clock, CheckCircle, Database, Signal } from 'lucide-react';

export default function SystemOverview({
  statusData,
  latestDecision,
  backendOnline,
  esp32Online,
}) {
  // Format timestamp
  const formatTime = (ts) => {
    if (!ts) return 'No telemetry yet';
    const date = new Date(ts * 1000);
    return date.toLocaleTimeString() + ' (' + date.toLocaleDateString() + ')';
  };

  const getRelativeTime = (ts) => {
    if (!ts) return '';
    const diffSec = Math.round((Date.now() / 1000) - ts);
    if (diffSec < 0) return 'Just now';
    if (diffSec < 60) return `${diffSec}s ago`;
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    return `${Math.floor(diffSec / 3600)}h ago`;
  };

  const soilMoisture = latestDecision?.soil_moisture_pct ?? '--';
  const temperature = latestDecision?.temperature_c ?? '--';
  const humidity = latestDecision?.humidity_pct ?? '--';
  const deviceId = latestDecision?.device_id || 'esp32-01';
  const lastTs = latestDecision?.timestamp || statusData?.last_decision_at;

  return (
    <div className="space-y-4">
      
      {/* 1. System Health Overview Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        {/* Backend Status Card */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">FastAPI Backend</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              backendOnline ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
            }`}>
              {backendOnline ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <div className="text-xl font-bold text-white tracking-tight flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${backendOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`}></span>
              <span>{backendOnline ? 'Connected' : 'Unavailable'}</span>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">Port 8000</span>
          </div>
        </div>

        {/* ESP32 Status Card */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">ESP32 Hardware</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              esp32Online ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
            }`}>
              {esp32Online ? 'ACTIVE' : 'STANDBY'}
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <div className="text-xl font-bold text-white tracking-tight flex items-center gap-1.5">
              <Signal className={`w-4 h-4 ${esp32Online ? 'text-sky-400' : 'text-amber-500'}`} />
              <span className="font-mono">{deviceId}</span>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">
              {esp32Online ? 'Live stream' : 'No recent ping'}
            </span>
          </div>
        </div>

        {/* Last Telemetry Timestamp Card */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Last Telemetry</span>
            <Clock className="w-4 h-4 text-slate-500" />
          </div>
          <div className="mt-2">
            <div className="text-sm font-semibold text-white font-mono truncate">
              {formatTime(lastTs)}
            </div>
            <span className="text-[11px] text-emerald-400 font-mono">
              {lastTs ? getRelativeTime(lastTs) : 'Waiting for telemetry...'}
            </span>
          </div>
        </div>

        {/* Total Decisions Logged Card */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Decisions Logged</span>
            <Database className="w-4 h-4 text-slate-500" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <div className="text-2xl font-black text-white font-mono">
              {statusData?.total_decisions_logged ?? 0}
            </div>
            <span className="text-[11px] text-slate-500 font-mono">SQLite DB</span>
          </div>
        </div>

      </div>

      {/* 2. Live Sensor Telemetry Cards */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-emerald-400" />
              Live Sensor Telemetry
            </h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-400">
              Device: {deviceId}
            </span>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            {latestDecision?.id ? `Sample #${latestDecision.id}` : 'Awaiting sensor sync'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          
          {/* Soil Moisture Card */}
          <div className="bg-slate-950/80 border border-slate-800/90 rounded-xl p-4 relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                <Droplets className="w-4 h-4 text-emerald-400" />
                Soil Moisture
              </span>
              <span className={`text-xs font-bold font-mono ${
                soilMoisture !== '--' && soilMoisture < 30 ? 'text-amber-400' : 'text-emerald-400'
              }`}>
                {soilMoisture !== '--' && soilMoisture < 30 ? 'DRY' : 'OPTIMAL / MOIST'}
              </span>
            </div>
            <div className="flex items-baseline space-x-1 mb-3">
              <span className="text-3xl font-black text-white font-mono tracking-tight">
                {soilMoisture}
              </span>
              <span className="text-lg text-slate-400 font-medium">%</span>
            </div>
            {/* Progress bar */}
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${
                  soilMoisture !== '--' && soilMoisture < 30 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${soilMoisture !== '--' ? Math.min(100, Math.max(0, soilMoisture)) : 0}%` }}
              ></div>
            </div>
          </div>

          {/* Temperature Card */}
          <div className="bg-slate-950/80 border border-slate-800/90 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                <Thermometer className="w-4 h-4 text-orange-400" />
                Ambient Temperature
              </span>
              <span className="text-xs font-mono text-slate-500">DHT11</span>
            </div>
            <div className="flex items-baseline space-x-1 mb-3">
              <span className="text-3xl font-black text-white font-mono tracking-tight">
                {temperature}
              </span>
              <span className="text-lg text-slate-400 font-medium">°C</span>
            </div>
            <div className="text-xs text-slate-500 font-mono">
              {temperature !== '--' ? `${((temperature * 9/5) + 32).toFixed(1)} °F` : 'Sensor standby'}
            </div>
          </div>

          {/* Humidity Card */}
          <div className="bg-slate-950/80 border border-slate-800/90 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                <Wind className="w-4 h-4 text-sky-400" />
                Relative Humidity
              </span>
              <span className="text-xs font-mono text-slate-500">DHT11</span>
            </div>
            <div className="flex items-baseline space-x-1 mb-3">
              <span className="text-3xl font-black text-white font-mono tracking-tight">
                {humidity}
              </span>
              <span className="text-lg text-slate-400 font-medium">%</span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-sky-500 transition-all duration-500"
                style={{ width: `${humidity !== '--' ? Math.min(100, Math.max(0, humidity)) : 0}%` }}
              ></div>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
