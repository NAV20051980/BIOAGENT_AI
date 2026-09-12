import { sensorData, weatherData } from "../data/demo";

const cards = [
  { label: "Soil Moisture", value: `${sensorData.soilMoisture}%`, status: "Moderately Dry", statusColor: "#d4722a", trend: "↓ -2% last 15m", trendColor: "#c0402a", updated: "11:42:07", icon: "💧", accent: "#d4722a" },
  { label: "Temperature", value: `${sensorData.temperature}°C`, status: "Normal", statusColor: "#5a8a3a", trend: "→ Stable", trendColor: "#a07848", updated: "11:42:07", icon: "🌡", accent: "#b87a2a" },
  { label: "Humidity", value: `${sensorData.humidity}%`, status: "Moderate", statusColor: "#5a8a3a", trend: "↑ +3% last 1h", trendColor: "#5a8a3a", updated: "11:42:07", icon: "🌬", accent: "#7a5a9a" },
  { label: "Rain Probability", value: `${weatherData.rainProbability}%`, status: "No Rain Expected", statusColor: "#a07848", trend: "→ Clear", trendColor: "#a07848", updated: "11:40:00", icon: "🌤", accent: "#7a9ab8" },
  { label: "Expected Rainfall", value: `${weatherData.expectedRainfall} mm`, status: "Insufficient", statusColor: "#a07848", trend: "→ 24h forecast", trendColor: "#a07848", updated: "11:40:00", icon: "🌧", accent: "#6a7a8a" },
  { label: "Pump Status", value: "ON", status: "Running · 15s", statusColor: "#5a8a3a", trend: "↑ Last: 11:42", trendColor: "#5a8a3a", updated: "11:42:09", icon: "⚙", accent: "#5a8a3a", glow: true },
];

export default function KPICards() {
  return (
    <div className="grid grid-cols-6 gap-3">
      {cards.map((c) => (
        <div
          key={c.label}
          className="card p-4 flex flex-col gap-2"
          style={c.glow ? { boxShadow: "0 0 0 1.5px #5a8a3a30, 0 4px 16px #5a8a3a14" } : {}}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-500" style={{ color: "#a07848", fontWeight: 500 }}>{c.label}</span>
            <span className="text-base">{c.icon}</span>
          </div>
          <div className="font-mono text-2xl font-700 leading-none" style={{ color: c.accent, fontFamily: "JetBrains Mono, monospace", fontWeight: 700 }}>
            {c.value}
          </div>
          <div>
            <span className="text-[10px] font-600 px-1.5 py-0.5 rounded-md" style={{ background: `${c.statusColor}18`, color: c.statusColor, fontWeight: 600 }}>
              {c.status}
            </span>
          </div>
          <div className="flex items-center justify-between pt-1 border-t" style={{ borderColor: "#e0c98a" }}>
            <span className="text-[10px] font-mono" style={{ color: c.trendColor }}>{c.trend}</span>
            <span className="text-[9px] font-mono" style={{ color: "#c0a870" }}>{c.updated}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
