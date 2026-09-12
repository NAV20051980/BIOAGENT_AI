import { aiDecision, sensorData, weatherData, plantData } from "../data/demo";

export default function AIDecision() {
  const isWater = aiDecision.decision === "WATER";

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Main decision */}
      <div
        className="card p-5 flex flex-col gap-4"
        style={
          isWater
            ? { background: "linear-gradient(135deg, #f7f0de, #edf5e8)", border: "1.5px solid #5a8a3a50", boxShadow: "0 4px 24px #5a8a3a18" }
            : { background: "linear-gradient(135deg, #f7f0de, #f5ead0)", border: "1.5px solid #d4722a50", boxShadow: "0 4px 24px #d4722a18" }
        }
      >
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-600 tracking-widest uppercase" style={{ color: "#a07848", fontWeight: 600, letterSpacing: "0.1em" }}>AI Irrigation Decision</h3>
          <span className="text-[10px] font-mono" style={{ color: "#c0a870" }}>{aiDecision.timestamp}</span>
        </div>

        {/* Decision banner */}
        <div
          className="rounded-2xl p-4 flex items-center gap-4"
          style={{
            background: isWater ? "#5a8a3a12" : "#d4722a12",
            border: `1.5px solid ${isWater ? "#5a8a3a35" : "#d4722a35"}`,
          }}
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
            style={{ background: isWater ? "#5a8a3a18" : "#d4722a18", border: `2px solid ${isWater ? "#5a8a3a40" : "#d4722a40"}` }}
          >
            {isWater ? "💧" : "🚫"}
          </div>
          <div>
            <div className="text-3xl font-900 tracking-tight leading-none" style={{ fontWeight: 900, color: isWater ? "#3a6a1a" : "#b85a10" }}>
              {isWater ? "WATER" : "DO NOT WATER"}
            </div>
            {isWater && (
              <div className="font-mono text-sm mt-1" style={{ color: "#7a5c3a" }}>
                Duration: <span style={{ color: "#b87a2a", fontWeight: 700 }}>{aiDecision.duration} seconds</span>
              </div>
            )}
          </div>
        </div>

        {/* Reason */}
        <div className="rounded-xl p-3" style={{ background: "#f0e4c480", border: "1px solid #d4b87a" }}>
          <div className="text-[10px] font-mono mb-1" style={{ color: "#c0a870" }}>AI REASONING</div>
          <p className="text-sm leading-relaxed" style={{ color: "#4a3020" }}>
            "{aiDecision.reason}"
          </p>
        </div>
      </div>

      {/* Reasoning breakdown */}
      <div className="card p-4 flex flex-col gap-3 flex-1">
        <h3 className="text-xs font-600 tracking-widest uppercase" style={{ color: "#a07848", fontWeight: 600, letterSpacing: "0.1em" }}>Why did AI decide this?</h3>

        <div className="grid grid-cols-2 gap-2">
          <ReasonItem label="Soil Moisture" value={`${sensorData.soilMoisture}%`} note="Current" color="#d4722a" />
          <ReasonItem label="Plant Requirement" value={`${plantData.idealMoistureMin}–${plantData.idealMoistureMax}%`} note="Ideal range" color="#5a8a3a" />
          <ReasonItem label="Rain Probability" value={`${weatherData.rainProbability}%`} note="Next 24h" color="#7a9ab8" />
          <ReasonItem label="Expected Rainfall" value={`${weatherData.expectedRainfall} mm`} note="Insufficient" color="#a07848" />
        </div>

        <div className="rounded-xl p-2.5" style={{ background: "#f0e4c4", border: "1px solid #d4b87a" }}>
          <div className="text-[10px] font-mono mb-1" style={{ color: "#c0a870" }}>RECENT WATERING HISTORY</div>
          <div className="text-xs" style={{ color: "#7a5c3a" }}>No natural recovery detected in last 3 cycles</div>
        </div>

        <div className="rounded-xl p-3 mt-auto" style={{ background: "#5a8a3a10", border: "1px solid #5a8a3a30" }}>
          <div className="text-[10px] font-mono mb-1" style={{ color: "#c0a870" }}>AI CONCLUSION</div>
          <div className="text-sm font-600" style={{ color: "#3a6a1a", fontWeight: 600 }}>
            Irrigation required. Soil is below plant optimal threshold and natural rainfall is unavailable.
          </div>
        </div>
      </div>
    </div>
  );
}

function ReasonItem({ label, value, note, color }: { label: string; value: string; note: string; color: string }) {
  return (
    <div className="rounded-xl p-2.5" style={{ background: "#f0e4c4", border: "1px solid #d4b87a" }}>
      <div className="text-[10px]" style={{ color: "#c0a870" }}>{label}</div>
      <div className="font-mono text-base font-700 leading-tight mt-0.5" style={{ color, fontWeight: 700 }}>{value}</div>
      <div className="text-[10px]" style={{ color: "#a07848" }}>{note}</div>
    </div>
  );
}
