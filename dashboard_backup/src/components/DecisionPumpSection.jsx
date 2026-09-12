import React from 'react';
import { BrainCircuit, Zap, ShieldCheck, Clock, CheckCircle, XCircle, AlertTriangle, ArrowRight } from 'lucide-react';

export default function DecisionPumpSection({
  decisionData,
  latestDecision
}) {
  // Use either the immediate response from POST /telemetry or the latest GET /latest-decision
  const decision = decisionData || (latestDecision?.trigger_pump !== undefined ? {
    trigger_pump: Boolean(latestDecision.trigger_pump),
    duration_sec: latestDecision.duration_sec,
    reason: latestDecision.reason,
  } : null);

  const isWater = Boolean(decision?.trigger_pump);
  const duration = decision?.duration_sec ?? 0;
  const reason = decision?.reason || 'No decision logged yet. Send telemetry above or run a test scenario.';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      
      {/* 1. AI Irrigation Decision Card (MOST IMPORTANT) */}
      <div className="lg:col-span-2 bg-slate-900/70 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between shadow-sm">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <BrainCircuit className="w-4 h-4 text-emerald-400" />
              AI Irrigation Decision (Source of Truth)
            </h3>
            <span className="text-[11px] font-mono bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700">
              Backend LLM Agent
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            
            {/* Primary Decision Banner */}
            <div className={`p-4 rounded-xl border flex items-center space-x-3.5 ${
              !decision ? 'bg-slate-950/60 border-slate-800 text-slate-400' :
              isWater 
                ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-300 shadow-sm shadow-emerald-950/50' 
                : 'bg-blue-950/40 border-blue-500/60 text-blue-300 shadow-sm shadow-blue-950/50'
            }`}>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xl ${
                !decision ? 'bg-slate-800 text-slate-500' :
                isWater ? 'bg-emerald-500 text-slate-950 shadow-inner' : 'bg-blue-500 text-slate-950 shadow-inner'
              }`}>
                {isWater ? <Zap className="w-6 h-6 fill-current" /> : <XCircle className="w-6 h-6" />}
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                  Action Recommendation
                </span>
                <span className="text-2xl font-black tracking-tight">
                  {!decision ? 'STANDBY' : (isWater ? 'WATER' : 'DO NOT WATER')}
                </span>
              </div>
            </div>

            {/* Duration Display */}
            <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl flex items-center space-x-3.5">
              <div className="w-12 h-12 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-300 font-bold">
                <Clock className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                  Pump Runtime Duration
                </span>
                <div className="flex items-baseline space-x-1">
                  <span className="text-2xl font-black text-white font-mono">{duration}</span>
                  <span className="text-xs text-slate-400 font-semibold">seconds (max 30s)</span>
                </div>
              </div>
            </div>

          </div>

          {/* AI Reasoning Explanation Box */}
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5 flex items-center justify-between">
              <span>Agent Chain of Thought & Reasoning</span>
              <span className="text-[10px] font-mono text-emerald-400">Function Calling: irrigation_decision</span>
            </span>
            <div className="p-3.5 bg-slate-950/90 border border-slate-800 rounded-xl text-xs text-slate-200 leading-relaxed font-sans min-h-[70px]">
              {reason}
            </div>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500 font-mono">
          <span>* Frontend does NOT compute water threshold logic</span>
          <span className="text-emerald-400 font-medium">✓ 100% LLM Evaluated</span>
        </div>
      </div>

      {/* 2. Pump Status & Safety Layer Column */}
      <div className="space-y-4">
        
        {/* PUMP STATUS Card */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-400" />
              PUMP STATUS
            </span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
              isWater ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}>
              {isWater ? 'COMMAND SENT' : 'OFF'}
            </span>
          </div>

          <div className="flex items-baseline space-x-2 my-2">
            <span className={`text-xl font-black font-mono ${isWater ? 'text-emerald-400' : 'text-slate-400'}`}>
              {isWater ? 'ACTIVE RELAY' : 'IDLE'}
            </span>
            <span className="text-xs text-slate-500 font-mono">
              ({duration}s signal)
            </span>
          </div>

          {/* Micro Flow Diagram */}
          <div className="mt-3 p-2 bg-slate-950 rounded-lg border border-slate-800/80 text-[10px] font-mono text-slate-400 space-y-1">
            <span className="text-slate-500 block font-semibold">Physical Execution Path:</span>
            <div className="flex items-center justify-between text-[10px] text-slate-300">
              <span>Frontend</span>
              <ArrowRight className="w-3 h-3 text-slate-600" />
              <span>FastAPI</span>
              <ArrowRight className="w-3 h-3 text-slate-600" />
              <span>ESP32</span>
              <ArrowRight className="w-3 h-3 text-slate-600" />
              <span className="text-emerald-400 font-bold">Relay</span>
            </div>
          </div>
        </div>

        {/* Safety Layer Card */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Safety Layer
            </span>
            <span className="text-[10px] font-mono text-emerald-400">Guarantees</span>
          </div>

          <ul className="space-y-1.5 text-[11px] text-slate-300 font-mono">
            <li className="flex items-center gap-1.5">
              <span className="text-emerald-400">✓</span> Structured AI response validation
            </li>
            <li className="flex items-center gap-1.5">
              <span className="text-emerald-400">✓</span> Max pump runtime hard cap: 30s
            </li>
            <li className="flex items-center gap-1.5">
              <span className="text-emerald-400">✓</span> Rapid double-watering prevention
            </li>
            <li className="flex items-center gap-1.5">
              <span className="text-emerald-400">✓</span> ESP32 runtime boundary check
            </li>
            <li className="flex items-center gap-1.5">
              <span className="text-emerald-400">✓</span> Backend failure uses local fail-safe
            </li>
          </ul>
        </div>

      </div>

    </div>
  );
}
