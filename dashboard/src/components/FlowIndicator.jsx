import React from 'react';
import { Camera, Search, BookOpen, Cpu, CloudRain, BrainCircuit, ShieldCheck, Zap, Check } from 'lucide-react';

export default function FlowIndicator({ checklist }) {
  const steps = [
    {
      id: 'plant_image',
      title: 'Plant Photo',
      icon: Camera,
      completed: checklist.plantIdentified,
      detail: checklist.plantIdentified ? 'Uploaded' : 'Pending',
    },
    {
      id: 'identification',
      title: 'Identification',
      icon: Search,
      completed: checklist.plantIdentified,
      detail: checklist.plantIdentified ? 'Classified' : 'Torch / Vision',
    },
    {
      id: 'profile',
      title: 'Care Profile',
      icon: BookOpen,
      completed: checklist.profileReceived,
      detail: checklist.profileReceived ? 'Loaded' : 'Awaiting profile',
    },
    {
      id: 'telemetry',
      title: 'ESP32 Telemetry',
      icon: Cpu,
      completed: checklist.telemetrySent,
      detail: checklist.telemetrySent ? 'Received' : 'Sensors',
    },
    {
      id: 'weather',
      title: 'Weather Intel',
      icon: CloudRain,
      completed: checklist.weatherReceived,
      detail: checklist.weatherReceived ? '24h Forecast' : 'OpenWeather / Demo',
    },
    {
      id: 'ai_reasoning',
      title: 'AI Reasoning',
      icon: BrainCircuit,
      completed: checklist.aiDecisionReceived,
      detail: checklist.aiDecisionReceived ? 'Evaluated' : 'Groq / LLM',
    },
    {
      id: 'safety',
      title: 'Safety Layer',
      icon: ShieldCheck,
      completed: checklist.aiDecisionReceived,
      detail: checklist.aiDecisionReceived ? 'Validated ≤30s' : 'Bounds & Clamps',
    },
    {
      id: 'pump',
      title: 'Pump Action',
      icon: Zap,
      completed: checklist.waterScenarioTested || checklist.noWaterScenarioTested,
      detail: checklist.waterScenarioTested ? 'Water / Hold' : 'Command Flow',
    },
  ];

  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 sm:p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <BrainCircuit className="w-3.5 h-3.5 text-emerald-400" />
          End-to-End System Pipeline Flow
        </h2>
        <span className="text-[11px] text-slate-500 font-mono">Realtime Stage Tracking</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          const isDone = step.completed;
          return (
            <div
              key={step.id}
              className={`relative flex flex-col items-center text-center p-2.5 rounded-xl border transition-all ${
                isDone
                  ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300 shadow-sm shadow-emerald-950/50'
                  : 'bg-slate-900/40 border-slate-800 text-slate-500'
              }`}
            >
              {/* Step number badge */}
              <div className="absolute top-1.5 right-1.5">
                {isDone ? (
                  <div className="w-4 h-4 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-bold text-[9px]">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                ) : (
                  <span className="text-[10px] font-mono text-slate-600">0{idx + 1}</span>
                )}
              </div>

              <div className={`p-2 rounded-lg mb-1.5 ${
                isDone ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800/60 text-slate-600'
              }`}>
                <Icon className="w-4 h-4" />
              </div>

              <span className="text-xs font-semibold leading-tight text-slate-200">
                {step.title}
              </span>
              <span className={`text-[10px] font-mono mt-0.5 ${isDone ? 'text-emerald-400' : 'text-slate-500'}`}>
                {step.detail}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
