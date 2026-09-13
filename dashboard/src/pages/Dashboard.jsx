import { useState, useMemo } from 'react';
import { useBioAgent } from '../context/BioAgentContext.jsx';
import MetricCards from '../components/dashboard/MetricCards.jsx';
import PlantHealthScore from '../components/dashboard/PlantHealthScore';
import WaterSavingsCard from '../components/dashboard/WaterSavingsCard.jsx';
import CentralPlantSystem from '../components/central-hero/CentralPlantSystem.jsx';
import InventoryPanel from '../components/inventory/InventoryPanel.jsx';
import GrowingAnalysisPanel from '../components/analysis/GrowingAnalysisPanel.jsx';
import DigitalTwinPanel from '../components/digital-twin/DigitalTwinPanel.jsx';
import PlantHistoryPanel from '../components/history/PlantHistoryPanel.jsx';
import MoistureChart from '../components/MoistureChart.jsx';
import MoistureSparkline from '../components/charts/MoistureSparkline.jsx';
import { DEFAULT_PLANT_ID, getPlantById, plants } from '../data/plants.js';
import { getTelemetryByPlantId } from '../data/telemetry.js';
import { currentWeather } from '../data/weather.js';
import { computeIrrigationDecision } from '../data/decisions.js';
import { getHistoryByPlantId } from '../data/history.js';
import './Dashboard.css';

const KPICards = MetricCards;

export default function Dashboard() {
  const {
    backendStatus,
    activePlant,
    latestTelemetry,
    latestDecision,
    weather: liveWeather,
    sessionHistory,
    telemetryHistory,
  } = useBioAgent();

  const [selectedPlantId, setSelectedPlantId] = useState(DEFAULT_PLANT_ID);

  const isDefaultSelected = selectedPlantId === DEFAULT_PLANT_ID || selectedPlantId === activePlant?.id;
  const staticPlant = getPlantById(selectedPlantId) || plants[0];
  const selectedPlant = isDefaultSelected && activePlant ? activePlant : staticPlant;

  const telemetry = isDefaultSelected && (latestTelemetry?.isLive || latestTelemetry?.soilMoisture != null)
    ? latestTelemetry
    : getTelemetryByPlantId(selectedPlantId);

  const decision = isDefaultSelected && latestDecision
    ? latestDecision
    : computeIrrigationDecision(selectedPlant, telemetry, liveWeather?.available ? liveWeather : currentWeather);

  const weather = liveWeather?.available ? liveWeather : currentWeather;
  const history = isDefaultSelected && sessionHistory && sessionHistory.length > 0
    ? sessionHistory
    : getHistoryByPlantId(selectedPlantId);

  const currentMoisture = Number(telemetry?.soilMoisture ?? telemetry?.soil_moisture_pct ?? 45);
  const idealMin = Number(selectedPlant?.idealMoistureMin ?? 40);
  const idealMax = Number(selectedPlant?.idealMoistureMax ?? 60);

  // Wire real moisture history data: filter for last 360 readings (6 hours at 1-min intervals) or real-time series
  const moistureHistoryData = useMemo(() => {
    const raw = (telemetryHistory && telemetryHistory.length > 0)
      ? telemetryHistory
      : (sessionHistory && sessionHistory.length > 0 ? sessionHistory : []);

    return raw.slice(-360).map((item) => ({
      timestamp: item.timestamp ? (item.timestamp > 1e11 ? item.timestamp : item.timestamp * 1000) : Date.now(),
      soil_moisture: item.soil_moisture ?? item.soilMoisture ?? item.soil_moisture_pct ?? item.moisture ?? currentMoisture,
      pump: Boolean(item.trigger_pump || item.type === 'watered' || item.decision === 'WATER' || item.pump),
      reason: item.reason,
    }));
  }, [telemetryHistory, sessionHistory, currentMoisture]);

  return (
    <div style={{
      background: 'linear-gradient(160deg, #e8d5a3 0%, #f0e4c4 50%, #e4d09a 100%)',
      minHeight: '100vh',
      padding: '20px'
    }}>
      <div style={{ maxWidth: '1600px', margin: '0 auto' }}>

        {/* ROW 1: KPI CARDS (4 columns full width) */}
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <KPICards />
        </div>

        {/* ROW 2: HEALTH SCORE + WATER SAVINGS (2 columns) */}
        {activePlant && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div style={{ minHeight: '300px' }}>
              <PlantHealthScore plantId={activePlant.id} activePlant={activePlant} />
            </div>
            <div style={{ minHeight: '300px' }}>
              <WaterSavingsCard />
            </div>
          </div>
        )}

        {/* ROW 3: MAIN CONTENT (Inventory + Analysis + Digital Twin) */}
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr 320px', gap: '16px', marginBottom: '20px' }}>

          {/* LEFT: Inventory Panel */}
          <div style={{
            background: '#f9f6f0',
            border: '1px solid #d4b87a',
            borderRadius: '12px',
            padding: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            height: 'fit-content'
          }}>
            <InventoryPanel
              selectedPlantId={selectedPlantId}
              onSelectPlant={setSelectedPlantId}
            />
          </div>

          {/* CENTER: Growing Analysis + Moisture Sparkline */}
          <div style={{
            background: '#f9f6f0',
            border: '1px solid #d4b87a',
            borderRadius: '12px',
            padding: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <GrowingAnalysisPanel
              plant={selectedPlant}
              telemetry={telemetry}
              weather={weather}
              decision={decision}
            />
            {activePlant && (
              <MoistureSparkline
                plantId={activePlant.id}
                currentMoisture={currentMoisture}
                idealMin={idealMin}
                idealMax={idealMax}
              />
            )}
          </div>

          {/* RIGHT: Digital Twin */}
          <div style={{
            background: '#f9f6f0',
            border: '1px solid #d4b87a',
            borderRadius: '12px',
            padding: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}>
            <DigitalTwinPanel
              plant={selectedPlant}
              telemetry={telemetry}
            />
          </div>
        </div>

        {/* ROW 4: HISTORY + MOISTURE CHART (2 columns) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
          <div style={{
            background: '#f9f6f0',
            border: '1px solid #d4b87a',
            borderRadius: '12px',
            padding: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            minHeight: '300px'
          }}>
            <PlantHistoryPanel
              plant={selectedPlant}
              telemetry={telemetry}
              decision={decision}
              history={history}
            />
          </div>
          <div style={{
            background: '#f9f6f0',
            border: '1px solid #d4b87a',
            borderRadius: '12px',
            padding: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            minHeight: '300px'
          }}>
            <MoistureChart
              data={moistureHistoryData}
              history={history}
              plant={selectedPlant}
              currentMoisture={currentMoisture}
              idealMin={idealMin}
              idealMax={idealMax}
            />
          </div>
        </div>

        {/* FOOTER */}
        <div style={{
          textAlign: 'center',
          padding: '20px',
          fontSize: '12px',
          color: '#a07848',
          borderTop: '1px solid #d4b87a'
        }}>
          <p>BioAgent AI · Autonomous Irrigation System · INFERENTIA HACKATHON 2026</p>
          <p>Team stdIO.H · Real-time monitoring with 5s polling</p>
        </div>

      </div>
    </div>
  );
}

