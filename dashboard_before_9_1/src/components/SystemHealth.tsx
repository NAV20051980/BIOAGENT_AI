const services = [
  { name: "ESP32", status: "Connected", ok: true },
  { name: "FastAPI Backend", status: "Online", ok: true },
  { name: "Groq AI", status: "Connected", ok: true },
  { name: "PlantNet", status: "Connected", ok: true },
  { name: "OpenWeather", status: "Connected", ok: true },
  { name: "Safety Validator", status: "Active", ok: true },
  { name: "Pump Relay", status: "Ready", ok: true },
];

export default function SystemHealth() {
  const allOk = services.every((s) => s.ok);

  return (
    <div className="card p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-600 tracking-widest uppercase" style={{ color: "#a07848", fontWeight: 600, letterSpacing: "0.1em" }}>System Health</h3>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full"
          style={{ background: allOk ? "#5a8a3a15" : "#c0402a15", border: `1px solid ${allOk ? "#5a8a3a30" : "#c0402a30"}`, color: allOk ? "#3a6a1a" : "#c0402a" }}>
          {allOk ? `${services.length}/${services.length} NOMINAL` : "DEGRADED"}
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        {services.map((s) => (
          <div key={s.name} className="flex items-center justify-between py-1.5 px-2 rounded-xl" style={{ background: "#f0e4c4", border: "1px solid #d4b87a" }}>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.ok ? "#5a8a3a" : "#c0402a", boxShadow: `0 0 4px ${s.ok ? "#5a8a3a60" : "#c0402a60"}` }} />
              <span className="text-xs" style={{ color: "#4a3020" }}>{s.name}</span>
            </div>
            <span className="text-[10px] font-mono" style={{ color: s.ok ? "#5a8a3a" : "#c0402a" }}>{s.status}</span>
          </div>
        ))}
      </div>

      <div className="rounded-xl p-2.5" style={{ background: "#f0e4c4", border: "1px solid #d4b87a" }}>
        <div className="text-[9px] font-mono mb-1" style={{ color: "#c0a870" }}>ALERTS</div>
        <div className="text-[10px]" style={{ color: "#a07848" }}>No active alerts. All systems nominal.</div>
      </div>
    </div>
  );
}
