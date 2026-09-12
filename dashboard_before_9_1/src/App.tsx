import Header from "./components/Header";
import KPICards from "./components/KPICards";
import PlantSection from "./components/PlantSection";
import AIDecision from "./components/AIDecision";
import SafetyPump from "./components/SafetyPump";
import TelemetryWeather from "./components/TelemetryWeather";
import IrrigationFlow from "./components/IrrigationFlow";
import MoistureChart from "./components/MoistureChart";
import HistoryScenario from "./components/HistoryScenario";
import SystemHealth from "./components/SystemHealth";

export default function App() {
  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(160deg, #e8d5a3 0%, #f0e4c4 50%, #e4d09a 100%)", fontFamily: "Inter, sans-serif" }}>
      <Header />

      <main className="max-w-[1600px] mx-auto px-6 py-5 flex flex-col gap-4">
        {/* KPI Strip */}
        <KPICards />

        {/* Main 3-column grid */}
        <div className="grid gap-3" style={{ gridTemplateColumns: "260px 1fr 260px" }}>
          {/* Left: Plant */}
          <PlantSection />

          {/* Center: AI Decision */}
          <AIDecision />

          {/* Right: Safety + Pump */}
          <SafetyPump />
        </div>

        {/* Irrigation Pipeline */}
        <IrrigationFlow />

        {/* Telemetry + Weather */}
        <TelemetryWeather />

        {/* Moisture Chart + System Health */}
        <div className="grid gap-3" style={{ gridTemplateColumns: "1fr 280px" }}>
          <MoistureChart />
          <SystemHealth />
        </div>

        {/* History + Scenarios */}
        <HistoryScenario />

        {/* Footer */}
        <div className="py-3 border-t flex items-center justify-between" style={{ borderColor: "#d4b87a" }}>
          <span className="font-mono text-[10px]" style={{ color: "#a07848" }}>
            BioAgent AI · Autonomous Irrigation System · Smart India Hackathon 2026
          </span>
          <span className="font-mono text-[10px] px-2 py-0.5 rounded-full" style={{ background: "#c8922a15", border: "1px solid #c8922a30", color: "#9a6010" }}>
            ⚡ DEMO MODE · Physical ESP32 + Relay Connected
          </span>
        </div>
      </main>
    </div>
  );
}
