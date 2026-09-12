import { sensorData, weatherData } from "../data/demo";

export default function TelemetryWeather() {
  return (
    <div className="grid grid-cols-2 gap-3">
      <SensorTelemetry />
      <WeatherIntelligence />
    </div>
  );
}

function SensorTelemetry() {
  const rows = [
    { key: "Soil Moisture", value: `${sensorData.soilMoisture}%`, color: "#d4722a" },
    { key: "Raw Sensor Value", value: `${sensorData.soilRaw} ADC`, color: "#a07848" },
    { key: "Temperature", value: `${sensorData.temperature}°C`, color: "#b87a2a" },
    { key: "Humidity", value: `${sensorData.humidity}%`, color: "#7a5a9a" },
    { key: "Device ID", value: sensorData.deviceId, color: "#7a9ab8" },
    { key: "Connection", value: "ESP32 · MQTT", color: "#5a8a3a" },
  ];

  return (
    <div className="card p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-600 tracking-widest uppercase" style={{ color: "#a07848", fontWeight: 600, letterSpacing: "0.1em" }}>Live Sensor Telemetry</h3>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full" style={{ background: "#5a8a3a", boxShadow: "0 0 4px #5a8a3a" }} />
          <span className="text-[10px] font-mono" style={{ color: "#5a8a3a" }}>LIVE</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {rows.map((r) => (
          <div key={r.key} className="rounded-xl p-2.5" style={{ background: "#f0e4c4", border: "1px solid #d4b87a" }}>
            <div className="text-[9px] font-mono" style={{ color: "#c0a870" }}>{r.key.toUpperCase()}</div>
            <div className="font-mono text-sm font-600 mt-0.5" style={{ color: r.color, fontWeight: 600 }}>{r.value}</div>
          </div>
        ))}
      </div>
      <div className="rounded-xl p-2 flex items-center justify-between" style={{ background: "#f0e4c4", border: "1px solid #d4b87a" }}>
        <span className="text-[10px]" style={{ color: "#a07848" }}>Last telemetry:</span>
        <span className="font-mono text-[10px]" style={{ color: "#7a5c3a" }}>{sensorData.lastReceived}</span>
      </div>
    </div>
  );
}

function WeatherIntelligence() {
  const rows = [
    { key: "Rain Probability", value: `${weatherData.rainProbability}%`, color: "#7a9ab8" },
    { key: "Expected Rainfall", value: `${weatherData.expectedRainfall} mm / 24h`, color: "#7a9ab8" },
    { key: "Condition", value: weatherData.condition, color: "#b87a2a" },
    { key: "Natural Watering", value: weatherData.naturalWatering ? "Sufficient" : "Unlikely", color: weatherData.naturalWatering ? "#5a8a3a" : "#d4722a" },
  ];

  return (
    <div className="card p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-600 tracking-widest uppercase" style={{ color: "#a07848", fontWeight: 600, letterSpacing: "0.1em" }}>Weather Intelligence</h3>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full" style={{ background: "#7a9ab815", border: "1px solid #7a9ab830", color: "#4a6a88" }}>OpenWeather</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {rows.map((r) => (
          <div key={r.key} className="rounded-xl p-2.5" style={{ background: "#f0e4c4", border: "1px solid #d4b87a" }}>
            <div className="text-[9px] font-mono" style={{ color: "#c0a870" }}>{r.key.toUpperCase()}</div>
            <div className="font-mono text-sm font-600 mt-0.5" style={{ color: r.color, fontWeight: 600 }}>{r.value}</div>
          </div>
        ))}
      </div>
      <div className="rounded-xl p-3" style={{ background: "#f0e4c4", border: "1px solid #d4b87a" }}>
        <div className="text-[10px] font-mono mb-1" style={{ color: "#c0a870" }}>FORECAST SUMMARY</div>
        <p className="text-xs leading-relaxed" style={{ color: "#7a5c3a" }}>{weatherData.forecast}</p>
      </div>
      <div className="rounded-xl p-2.5 flex items-center gap-2" style={{ background: "#d4722a0a", border: "1px solid #d4722a25" }}>
        <span className="text-base">⚠️</span>
        <span className="text-xs" style={{ color: "#b85a10" }}>No natural rainfall available. AI decision elevated irrigation priority.</span>
      </div>
    </div>
  );
}
