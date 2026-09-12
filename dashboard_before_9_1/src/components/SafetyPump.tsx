import { useState } from "react";

export default function SafetyPump() {
  return (
    <div className="flex flex-col gap-3 h-full">
      <SafetyValidation />
      <PumpControl />
    </div>
  );
}

function SafetyValidation() {
  const checks = [
    { label: "Valid JSON response", passed: true },
    { label: "Pump duration 1–30s range", passed: true },
    { label: "Trigger value validated", passed: true },
    { label: "Safety constraints passed", passed: true },
    { label: "Hardware command approved", passed: true },
  ];

  return (
    <div className="card p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-600 tracking-widest uppercase" style={{ color: "#a07848", fontWeight: 600, letterSpacing: "0.1em" }}>Safety Layer</h3>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full" style={{ background: "#5a8a3a15", border: "1px solid #5a8a3a30", color: "#3a6a1a" }}>ALL PASS</span>
      </div>

      <div className="flex flex-col items-center gap-0">
        <FlowStep label="AI Proposes" color="#b87a2a" />
        <FlowArrow />
        <FlowStep label="Safety Validator" color="#d4722a" active />
        <FlowArrow />
        <FlowStep label="ESP32 Actuates" color="#5a8a3a" />
      </div>

      <div className="flex flex-col gap-1.5">
        {checks.map((c) => (
          <div key={c.label} className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "#5a8a3a18", border: "1px solid #5a8a3a35" }}>
              <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
                <path d="M2 6l3 3 5-5" stroke="#5a8a3a" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <span className="text-[11px]" style={{ color: "#7a5c3a" }}>{c.label}</span>
          </div>
        ))}
      </div>

      <div className="rounded-xl p-2 text-center text-[10px] font-mono" style={{ background: "#5a8a3a0a", border: "1px solid #5a8a3a25", color: "#3a6a1a" }}>
        AI proposes. Safety layer validates. ESP32 actuates.
      </div>
    </div>
  );
}

function FlowStep({ label, color, active }: { label: string; color: string; active?: boolean }) {
  return (
    <div className="w-full py-1.5 px-3 rounded-xl text-center text-[10px] font-mono font-600"
      style={{ background: active ? `${color}15` : `${color}08`, border: `1px solid ${color}${active ? "45" : "20"}`, color: active ? color : `${color}99`, fontWeight: 600 }}>
      {label}
    </div>
  );
}

function FlowArrow() {
  return (
    <div className="flex flex-col items-center">
      <div className="w-px h-2" style={{ background: "#d4b87a" }} />
      <svg width="8" height="5" viewBox="0 0 8 5" fill="none"><path d="M4 5L0 0h8L4 5z" fill="#d4b87a" /></svg>
    </div>
  );
}

function PumpControl() {
  const [duration, setDuration] = useState(10);
  const [running, setRunning] = useState(false);

  return (
    <div className="card p-4 flex flex-col gap-3 flex-1">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-600 tracking-widest uppercase" style={{ color: "#a07848", fontWeight: 600, letterSpacing: "0.1em" }}>Pump Control</h3>
        <span className="font-mono text-xs font-700 px-2 py-0.5 rounded-full" style={{ background: "#5a8a3a15", border: "1px solid #5a8a3a30", color: "#3a6a1a", fontWeight: 700 }}>ON</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <StatItem label="Runtime" value="15s" />
        <StatItem label="Last Active" value="11:42" />
        <StatItem label="Requested" value="15s" />
        <StatItem label="Safety OK" value="15s" color="#3a6a1a" />
      </div>

      <div className="rounded-xl p-3 flex flex-col gap-2" style={{ background: "#f0e4c4", border: "1px dashed #d4b87a" }}>
        <div className="flex items-center gap-2">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#d4722a" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <span className="text-[10px] font-mono font-600" style={{ color: "#b85a10", fontWeight: 600 }}>MANUAL TEST MODE — DEMO ONLY</span>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[10px]" style={{ color: "#a07848" }}>Duration:</label>
          <input type="range" min={1} max={30} value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="flex-1 h-1 rounded" style={{ accentColor: "#c8922a" }} />
          <span className="font-mono text-xs w-8 text-right" style={{ color: "#b87a2a" }}>{duration}s</span>
        </div>
        <button
          onClick={() => setRunning(!running)}
          className="w-full py-1.5 rounded-xl text-xs font-600 transition-all"
          style={{ background: running ? "#c0402a18" : "linear-gradient(135deg, #c8922a, #e8b84a)", border: `1px solid ${running ? "#c0402a40" : "#c8a45a"}`, color: running ? "#c0402a" : "#fff", fontWeight: 600 }}
        >
          {running ? "Stop Pump" : "Test Pump"}
        </button>
      </div>
    </div>
  );
}

function StatItem({ label, value, color = "#2d1f0e" }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-xl p-2" style={{ background: "#f0e4c4", border: "1px solid #d4b87a" }}>
      <div className="text-[9px] font-mono" style={{ color: "#c0a870" }}>{label}</div>
      <div className="font-mono text-sm font-600" style={{ color, fontWeight: 600 }}>{value}</div>
    </div>
  );
}
