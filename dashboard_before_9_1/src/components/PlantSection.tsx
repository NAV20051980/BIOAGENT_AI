import { useState } from "react";
import { plantData, sensorData } from "../data/demo";
import plantImg from "../imports/Gemini_Generated_Image_vz0whlvz0whlvz0w.png";

export default function PlantSection() {
  return (
    <div className="flex flex-col gap-3 h-full">
      <PlantIntelligence />
      <PlantProfile />
    </div>
  );
}

function PlantIntelligence() {
  const [identifying, setIdentifying] = useState(false);

  const handleIdentify = () => {
    setIdentifying(true);
    setTimeout(() => setIdentifying(false), 2000);
  };

  return (
    <div className="card p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-600 tracking-widest uppercase" style={{ color: "#a07848", fontWeight: 600, letterSpacing: "0.1em" }}>Plant Intelligence</h3>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full" style={{ background: "#5a8a3a15", border: "1px solid #5a8a3a30", color: "#3a6a1a" }}>
          Active Profile
        </span>
      </div>

      <div className="relative rounded-xl overflow-hidden" style={{ aspectRatio: "4/3", background: "#ede0c0" }}>
        <img src={plantImg} alt="Bael plant - Aegle marmelos" className="w-full h-full object-cover" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, #2d1f0ecc, transparent 50%)" }} />
        <div className="absolute bottom-2 left-2 right-2">
          <div className="text-sm font-700" style={{ fontWeight: 700, color: "#fff" }}>{plantData.commonName}</div>
          <div className="text-[10px] font-mono italic" style={{ color: "#e8d5a3" }}>{plantData.scientificName}</div>
        </div>
      </div>

      <div className="rounded-xl p-3 flex items-center justify-between" style={{ background: "#f0e4c4", border: "1px solid #d4b87a" }}>
        <div>
          <div className="text-[10px] font-mono" style={{ color: "#a07848" }}>CONFIDENCE</div>
          <div className="font-mono text-lg font-600" style={{ color: "#d4722a", fontWeight: 600 }}>{plantData.confidence}%</div>
        </div>
        <div className="text-right">
          <div className="text-[10px]" style={{ color: "#a07848" }}>PlantNet API</div>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full" style={{ background: "#5a8a3a15", color: "#3a6a1a" }}>IDENTIFIED</span>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleIdentify}
          disabled={identifying}
          className="flex-1 py-1.5 rounded-xl text-xs font-600 transition-all"
          style={{ background: identifying ? "#f0e4c4" : "linear-gradient(135deg, #c8922a, #e8b84a)", border: "1px solid #c8a45a", color: identifying ? "#a07848" : "#fff", fontWeight: 600 }}
        >
          {identifying ? "Identifying…" : "Re-identify Plant"}
        </button>
        <button className="px-3 py-1.5 rounded-xl text-xs font-600" style={{ background: "#f0e4c4", border: "1px solid #d4b87a", color: "#7a5c3a", fontWeight: 600 }}>
          Upload
        </button>
      </div>
    </div>
  );
}

function PlantProfile() {
  const moisture = sensorData.soilMoisture;
  const min = plantData.idealMoistureMin;
  const max = plantData.idealMoistureMax;

  return (
    <div className="card p-4 flex flex-col gap-3 flex-1">
      <h3 className="text-xs font-600 tracking-widest uppercase" style={{ color: "#a07848", fontWeight: 600, letterSpacing: "0.1em" }}>Plant Profile</h3>

      <div>
        <div className="font-700 text-sm" style={{ fontWeight: 700, color: "#2d1f0e" }}>{plantData.commonName}</div>
        <div className="text-[10px] font-mono italic" style={{ color: "#a07848" }}>{plantData.scientificName}</div>
      </div>

      <div className="text-xs" style={{ color: "#7a5c3a" }}>
        <span className="font-600" style={{ fontWeight: 600, color: "#2d1f0e" }}>Growth Stage: </span>
        {plantData.growthStage}
      </div>

      <div>
        <div className="flex justify-between mb-1.5">
          <span className="text-[10px] font-mono" style={{ color: "#a07848" }}>SOIL MOISTURE</span>
          <span className="text-[10px] font-mono" style={{ color: "#5a8a3a" }}>IDEAL: {min}–{max}%</span>
        </div>
        <div className="relative h-5 rounded-full" style={{ background: "#ede0c0", border: "1px solid #d4b87a" }}>
          <div
            className="absolute top-0 bottom-0 rounded-full"
            style={{ left: `${min}%`, width: `${max - min}%`, background: "#5a8a3a20", borderLeft: "1px solid #5a8a3a40", borderRight: "1px solid #5a8a3a40" }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full"
            style={{
              left: `calc(${moisture}% - 5px)`,
              background: moisture < min ? "#d4722a" : moisture > max ? "#c0402a" : "#5a8a3a",
              boxShadow: `0 0 6px ${moisture < min ? "#d4722a80" : "#5a8a3a80"}`,
            }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[9px] font-mono" style={{ color: "#c0a870" }}>DRY 0%</span>
          <span className="text-[9px] font-mono font-600" style={{ color: "#d4722a", fontWeight: 600 }}>NOW {moisture}%</span>
          <span className="text-[9px] font-mono" style={{ color: "#c0a870" }}>WET 100%</span>
        </div>
      </div>

      <div className="text-[10px] leading-relaxed" style={{ color: "#a07848" }}>{plantData.wateringNotes}</div>
    </div>
  );
}
