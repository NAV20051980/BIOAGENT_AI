import React, { useState } from 'react';
import { Activity, RefreshCw, Server, Cpu, Settings, CheckCircle2, AlertTriangle } from 'lucide-react';
import { getApiBaseUrl, setApiBaseUrl } from '../api';

export default function Header({ 
  backendOnline, 
  esp32Online, 
  isPolling, 
  setIsPolling, 
  onRefresh, 
  isLoading 
}) {
  const [showConfig, setShowConfig] = useState(false);
  const [urlInput, setUrlInput] = useState(getApiBaseUrl());

  const handleSaveUrl = (e) => {
    e.preventDefault();
    setApiBaseUrl(urlInput);
    setShowConfig(false);
    onRefresh();
  };

  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        
        {/* Brand & Team */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-2xl shadow-inner shadow-emerald-500/20">
            🌿
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-bold text-white tracking-tight">BioAgent AI</h1>
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                PROTOTYPE TEST DASHBOARD
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              Team stdIO.H · INFERENTIA Hackathon · Edge-IoT Smart Agriculture
            </p>
          </div>
        </div>

        {/* Status Indicators & Controls */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 text-xs">
          
          {/* Backend Status Badge */}
          <div className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border font-medium ${
            backendOnline 
              ? 'bg-emerald-950/50 border-emerald-800/80 text-emerald-300' 
              : 'bg-rose-950/50 border-rose-800/80 text-rose-300'
          }`}>
            <Server className="w-3.5 h-3.5" />
            <span>FastAPI:</span>
            <span className="font-bold">{backendOnline ? 'ONLINE' : 'OFFLINE'}</span>
            <span className={`w-2 h-2 rounded-full ${backendOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`}></span>
          </div>

          {/* ESP32 Status Badge */}
          <div className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border font-medium ${
            esp32Online 
              ? 'bg-sky-950/50 border-sky-800/80 text-sky-300' 
              : 'bg-amber-950/50 border-amber-800/80 text-amber-300'
          }`}>
            <Cpu className="w-3.5 h-3.5" />
            <span>ESP32:</span>
            <span className="font-bold">{esp32Online ? 'ONLINE' : 'STANDBY'}</span>
            <span className={`w-2 h-2 rounded-full ${esp32Online ? 'bg-sky-400' : 'bg-amber-500'}`}></span>
          </div>

          {/* Auto-poll Toggle */}
          <button
            onClick={() => setIsPolling(!isPolling)}
            className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg border transition-all ${
              isPolling 
                ? 'bg-slate-800 border-slate-700 text-emerald-400' 
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle background telemetry polling"
          >
            <Activity className={`w-3.5 h-3.5 ${isPolling ? 'animate-spin text-emerald-400' : ''}`} />
            <span>Poll (5s): {isPolling ? 'ON' : 'OFF'}</span>
          </button>

          {/* Manual Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-medium shadow-sm transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          {/* API URL Config Button */}
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-all"
            title="Configure Backend API URL"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Collapsible API URL Config Drawer */}
      {showConfig && (
        <div className="border-t border-slate-800 bg-slate-950/95 px-4 sm:px-8 py-3">
          <form onSubmit={handleSaveUrl} className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center gap-3">
            <span className="text-xs text-slate-400 font-mono flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-emerald-400" />
              API Base URL (<code>VITE_API_BASE_URL</code>):
            </span>
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
              placeholder="http://localhost:8000"
            />
            <button
              type="submit"
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-all"
            >
              Update URL
            </button>
            <button
              type="button"
              onClick={() => { setUrlInput('http://localhost:8000'); setApiBaseUrl('http://localhost:8000'); setShowConfig(false); onRefresh(); }}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
            >
              Reset to Localhost
            </button>
          </form>
        </div>
      )}
    </header>
  );
}
