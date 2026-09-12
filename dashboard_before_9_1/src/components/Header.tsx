import { useState, useEffect } from "react";

export default function Header() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b" style={{ background: "#f0e4c4e8", backdropFilter: "blur(16px)", borderColor: "#d4b87a" }}>
      <div className="max-w-[1600px] mx-auto px-6 py-3 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #c8922a, #e8b84a)", boxShadow: "0 2px 8px #c8922a40" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L3 7l9 5 9-5-9-5z" fill="white" opacity="0.95" />
              <path d="M3 12l9 5 9-5" stroke="white" strokeWidth="1.5" fill="none" opacity="0.75" />
              <path d="M3 17l9 5 9-5" stroke="white" strokeWidth="1.5" fill="none" opacity="0.5" />
            </svg>
          </div>
          <div>
            <div className="text-sm" style={{ color: "#2d1f0e", fontWeight: 800, letterSpacing: "-0.02em" }}>BioAgent AI</div>
            <div className="text-[10px] font-mono" style={{ color: "#a07848", letterSpacing: "0.08em" }}>AUTONOMOUS AI IRRIGATION AGENT</div>
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center gap-2">
          <span className="badge-online">SYSTEM ONLINE</span>
          <StatusPill label="ESP32" ok />
          <StatusPill label="FastAPI" ok />
          <StatusPill label="Groq AI" ok />

          <div className="w-px h-5 mx-1" style={{ background: "#d4b87a" }} />

          <div className="text-right">
            <div className="font-mono text-xs font-600" style={{ color: "#b87a2a", fontWeight: 600 }}>
              {time.toLocaleTimeString("en-IN", { hour12: false })}
            </div>
            <div className="font-mono text-[10px]" style={{ color: "#a07848" }}>
              {time.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
            </div>
          </div>

          <div className="w-px h-5 mx-1" style={{ background: "#d4b87a" }} />

          <span className="px-2 py-1 rounded-lg text-[10px] font-mono font-600" style={{ background: "#c8922a15", border: "1px solid #c8922a35", color: "#9a6010", fontWeight: 600 }}>
            ⚡ HACKATHON DEMO
          </span>

          <button className="relative w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#f0e4c4", border: "1px solid #d4b87a" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#a07848" strokeWidth="2">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
            </svg>
            <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full text-[8px] flex items-center justify-center font-bold" style={{ background: "#c8922a", color: "#fff" }}>1</span>
          </button>

          <div className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-[11px]" style={{ background: "linear-gradient(135deg, #c8922a, #e8b84a)", color: "#fff" }}>
            BA
          </div>
        </div>
      </div>
    </header>
  );
}

function StatusPill({ label, ok }: { label: string; ok: boolean }) {
  return (
    <span className="px-2 py-1 rounded-lg text-[10px] font-mono flex items-center gap-1.5" style={{ background: ok ? "#5a8a3a12" : "#c0402a12", border: `1px solid ${ok ? "#5a8a3a28" : "#c0402a28"}`, color: ok ? "#3a6a1a" : "#c0402a" }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: ok ? "#5a8a3a" : "#c0402a" }} />
      {label}
    </span>
  );
}
