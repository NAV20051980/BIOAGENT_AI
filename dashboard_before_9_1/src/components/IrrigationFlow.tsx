const stages = [
  { id: 1, label: "ESP32\nSensors", icon: "📡", active: false, done: true },
  { id: 2, label: "Plant\nIdentification", icon: "🌿", active: false, done: true },
  { id: 3, label: "Plant\nProfile", icon: "📋", active: false, done: true },
  { id: 4, label: "Weather\nData", icon: "🌤", active: false, done: true },
  { id: 5, label: "AI\nReasoning", icon: "🧠", active: false, done: true },
  { id: 6, label: "Safety\nValidation", icon: "🛡", active: true, done: false },
  { id: 7, label: "Pump\nActuation", icon: "⚙", active: false, done: false },
];

export default function IrrigationFlow() {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-600 tracking-widest uppercase" style={{ color: "#a07848", fontWeight: 600, letterSpacing: "0.1em" }}>
          Irrigation Pipeline — Active Cycle
        </h3>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full" style={{ background: "#5a8a3a15", border: "1px solid #5a8a3a30", color: "#3a6a1a" }}>
          Stage 6/7 · Safety Validation
        </span>
      </div>

      <div className="flex items-center justify-between">
        {stages.map((stage, i) => (
          <div key={stage.id} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-all"
                style={{
                  background: stage.active ? "#c8922a18" : stage.done ? "#5a8a3a12" : "#f0e4c4",
                  border: stage.active ? "2px solid #c8922a60" : stage.done ? "1px solid #5a8a3a35" : "1px solid #d4b87a",
                  boxShadow: stage.active ? "0 0 16px #c8922a30" : "none",
                }}
              >
                {stage.icon}
              </div>
              <div className="text-center text-[9px] font-mono mt-1.5 leading-tight whitespace-pre-line"
                style={{ color: stage.active ? "#b87a2a" : stage.done ? "#5a8a3a" : "#c0a870" }}>
                {stage.label}
              </div>
              {stage.done && <span className="text-[8px] font-mono mt-0.5" style={{ color: "#5a8a3a80" }}>✓ done</span>}
              {stage.active && <span className="text-[8px] font-mono mt-0.5" style={{ color: "#b87a2a" }}>● active</span>}
            </div>
            {i < stages.length - 1 && (
              <div className="h-px flex-none" style={{ width: "24px", background: stages[i + 1].done || stages[i + 1].active ? "linear-gradient(to right, #5a8a3a60, #c8922a40)" : "#d4b87a60" }} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
