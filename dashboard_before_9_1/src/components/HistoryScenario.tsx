import { useState } from "react";
import { irrigationHistory, scenarios } from "../data/demo";

export default function HistoryScenario() {
  return (
    <div className="grid grid-cols-2 gap-3">
      <IrrigationHistory />
      <ScenarioTesting />
    </div>
  );
}

function IrrigationHistory() {
  return (
    <div className="card p-4 flex flex-col gap-3">
      <h3 className="text-xs font-600 tracking-widest uppercase" style={{ color: "#a07848", fontWeight: 600, letterSpacing: "0.1em" }}>Irrigation History</h3>
      <div className="overflow-auto">
        <table className="w-full text-[11px]" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Time", "Plant", "Moisture", "Rain%", "Decision", "Duration", "Safety"].map((h) => (
                <th key={h} className="text-left pb-2 pr-3 font-mono font-600 whitespace-nowrap" style={{ color: "#c0a870", fontWeight: 600, borderBottom: "1px solid #d4b87a" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {irrigationHistory.map((row, i) => (
              <tr key={i} className="border-b" style={{ borderColor: "#ede0c0" }}>
                <td className="py-2 pr-3 font-mono" style={{ color: "#a07848" }}>{row.time}</td>
                <td className="py-2 pr-3" style={{ color: "#2d1f0e" }}>{row.plant}</td>
                <td className="py-2 pr-3 font-mono" style={{ color: "#d4722a" }}>{row.moisture}%</td>
                <td className="py-2 pr-3 font-mono" style={{ color: "#7a9ab8" }}>{row.rainProb}%</td>
                <td className="py-2 pr-3">
                  <span className="font-mono font-700 px-1.5 py-0.5 rounded-full text-[10px]"
                    style={{ background: row.decision === "WATER" ? "#5a8a3a15" : "#d4722a15", color: row.decision === "WATER" ? "#3a6a1a" : "#b85a10", fontWeight: 700 }}>
                    {row.decision}
                  </span>
                </td>
                <td className="py-2 pr-3 font-mono" style={{ color: "#b87a2a" }}>{row.duration}</td>
                <td className="py-2 pr-3">
                  {row.safety === "APPROVED"
                    ? <span className="font-mono text-[10px]" style={{ color: "#5a8a3a" }}>✓ {row.safety}</span>
                    : <span className="font-mono text-[10px]" style={{ color: "#c0a870" }}>{row.safety}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ScenarioTesting() {
  const [active, setActive] = useState(scenarios[0]);

  return (
    <div className="card p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-600 tracking-widest uppercase" style={{ color: "#a07848", fontWeight: 600, letterSpacing: "0.1em" }}>Demo Scenarios</h3>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full" style={{ background: "#d4722a15", border: "1px solid #d4722a30", color: "#b85a10" }}>TESTING CONSOLE</span>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        {scenarios.map((s) => (
          <button key={s.id} onClick={() => setActive(s)} className="py-1.5 px-2 rounded-xl text-[10px] font-mono font-600 text-left transition-all"
            style={{ background: active.id === s.id ? `${s.color}18` : "#f0e4c4", border: `1px solid ${active.id === s.id ? `${s.color}45` : "#d4b87a"}`, color: active.id === s.id ? s.color : "#7a5c3a", fontWeight: 600 }}>
            {s.label}
          </button>
        ))}
      </div>

      <div className="rounded-xl p-3 flex-1" style={{ background: "#f0e4c4", border: "1px solid #d4b87a" }}>
        <div className="text-[10px] font-mono mb-2" style={{ color: "#c0a870" }}>SCENARIO INPUT CONDITIONS</div>
        <div className="grid grid-cols-3 gap-2 mb-3">
          <MiniStat label="Moisture" value={`${active.moisture}%`} color="#d4722a" />
          <MiniStat label="Rain Prob" value={`${active.rainProb}%`} color="#7a9ab8" />
          <MiniStat label="Rainfall" value={`${active.rainfall}mm`} color="#7a9ab8" />
        </div>
        <div className="flex items-center gap-2 mb-2">
          <span className="font-mono text-base font-900 px-2 py-0.5 rounded-full"
            style={{ background: active.decision === "WATER" ? "#5a8a3a15" : "#d4722a15", color: active.decision === "WATER" ? "#3a6a1a" : "#b85a10", fontWeight: 900 }}>
            {active.decision}
          </span>
          {active.duration > 0 && <span className="font-mono text-xs" style={{ color: "#b87a2a" }}>→ {active.duration}s</span>}
        </div>
        <p className="text-[10px] leading-relaxed" style={{ color: "#7a5c3a" }}>{active.reason}</p>
      </div>
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl p-1.5" style={{ background: "#f7f0de", border: "1px solid #d4b87a" }}>
      <div className="text-[8px] font-mono" style={{ color: "#c0a870" }}>{label}</div>
      <div className="font-mono text-xs font-600" style={{ color, fontWeight: 600 }}>{value}</div>
    </div>
  );
}
