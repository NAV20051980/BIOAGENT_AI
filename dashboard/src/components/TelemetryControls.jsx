import React, { useState } from 'react';
import { Send, Sliders, PlayCircle, RefreshCw, AlertCircle, Check } from 'lucide-react';
import { sendTelemetry } from '../api';

export default function TelemetryControls({
  onTelemetrySuccess,
  backendOnline,
  currentProfile
}) {
  const [soilMoisture, setSoilMoisture] = useState('20');
  const [temperature, setTemperature] = useState('30');
  const [humidity, setHumidity] = useState('57');
  const [deviceId, setDeviceId] = useState('esp32-01');
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [activePreset, setActivePreset] = useState('dry');

  const presets = [
    {
      id: 'dry',
      label: 'TEST 1: Dry Soil (20%)',
      desc: 'Below threshold → Expect WATER',
      soil: '20',
      temp: '30',
      hum: '40',
      color: 'border-amber-500/40 text-amber-300 bg-amber-950/20 hover:bg-amber-950/40',
    },
    {
      id: 'optimal',
      label: 'TEST 2: Optimal Soil (55%)',
      desc: 'In ideal range → Expect DO NOT WATER',
      soil: '55',
      temp: '26',
      hum: '60',
      color: 'border-emerald-500/40 text-emerald-300 bg-emerald-950/20 hover:bg-emerald-950/40',
    },
    {
      id: 'wet',
      label: 'TEST 3: Wet Soil (77%)',
      desc: 'Above threshold → Expect DO NOT WATER',
      soil: '77',
      temp: '22',
      hum: '75',
      color: 'border-blue-500/40 text-blue-300 bg-blue-950/20 hover:bg-blue-950/40',
    },
    {
      id: 'stress',
      label: 'TEST 4: Critical Drought (1%)',
      desc: 'Extreme deficit → Max Pump (30s)',
      soil: '1',
      temp: '35',
      hum: '25',
      color: 'border-rose-500/40 text-rose-300 bg-rose-950/20 hover:bg-rose-950/40',
    },
  ];

  const applyPreset = (preset) => {
    setActivePreset(preset.id);
    setSoilMoisture(preset.soil);
    setTemperature(preset.temp);
    setHumidity(preset.hum);
  };

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    if (!backendOnline) {
      setErrorMsg('Backend is offline. Start uvicorn server on port 8000.');
      return;
    }

    setSending(true);
    setErrorMsg(null);

    const payload = {
      soil_moisture_pct: parseFloat(soilMoisture),
      temperature_c: parseFloat(temperature),
      humidity_pct: parseFloat(humidity),
      device_id: deviceId,
    };

    const res = await sendTelemetry(payload);
    setSending(false);

    if (res.ok && res.data) {
      if (onTelemetrySuccess) {
        onTelemetrySuccess(payload, res.data);
      }
    } else {
      setErrorMsg(res.error || 'Telemetry request failed.');
    }
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-emerald-400" />
            Manual Telemetry Test Controls
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Inject telemetry into <code>POST /telemetry</code>. The FastAPI backend passes telemetry + history to the Groq reasoning agent.
          </p>
        </div>
        <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded border border-emerald-800/60 self-start sm:self-auto">
          POST /telemetry
        </span>
      </div>

      {/* Preset Quick Test Buttons */}
      <div className="mb-5">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
          Automated Test Presets:
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {presets.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => applyPreset(p)}
              className={`text-left p-2.5 rounded-xl border transition-all ${p.color} ${
                activePreset === p.id ? 'ring-1 ring-emerald-400 font-medium' : ''
              }`}
            >
              <div className="text-xs font-bold leading-tight">{p.label}</div>
              <div className="text-[10px] text-slate-400 font-mono mt-0.5">{p.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Input Form */}
      <form onSubmit={handleSend} className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          
          {/* Soil Moisture % */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
              <span>Soil Moisture</span>
              <span className="text-emerald-400 font-mono font-bold">%</span>
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="100"
              required
              value={soilMoisture}
              onChange={(e) => { setSoilMoisture(e.target.value); setActivePreset(null); }}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-emerald-500"
              placeholder="20"
            />
          </div>

          {/* Temperature °C */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
              <span>Temperature</span>
              <span className="text-orange-400 font-mono font-bold">°C</span>
            </label>
            <input
              type="number"
              step="0.1"
              min="-10"
              max="60"
              required
              value={temperature}
              onChange={(e) => { setTemperature(e.target.value); setActivePreset(null); }}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-emerald-500"
              placeholder="30"
            />
          </div>

          {/* Humidity % */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
              <span>Humidity</span>
              <span className="text-sky-400 font-mono font-bold">%</span>
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="100"
              required
              value={humidity}
              onChange={(e) => { setHumidity(e.target.value); setActivePreset(null); }}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-emerald-500"
              placeholder="57"
            />
          </div>

          {/* Device ID */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
              <span>Device ID</span>
              <span className="text-slate-500 font-mono font-bold">ESP32</span>
            </label>
            <input
              type="text"
              required
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-emerald-500"
              placeholder="esp32-01"
            />
          </div>

        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-950/40 border border-rose-800 rounded-xl text-xs text-rose-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <div className="text-xs text-slate-400 font-mono">
            Target: <code>{deviceId}</code> · Soil: <span className="text-emerald-400 font-bold">{soilMoisture}%</span>
          </div>
          <button
            type="submit"
            disabled={sending || !backendOnline}
            className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50"
          >
            {sending ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Invoking AI Reasoning Agent...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send Test Telemetry (POST /telemetry)
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
