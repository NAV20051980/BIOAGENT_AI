import { useState, useMemo } from 'react';
import { useBioAgent } from '../context/BioAgentContext.jsx';
import MetricCards from '../components/dashboard/MetricCards.jsx';
import DemoWeatherControls from '../components/DemoWeatherControls.jsx';
import CentralPlantSystem from '../components/central-hero/CentralPlantSystem.jsx';
import InventoryPanel from '../components/inventory/InventoryPanel.jsx';
import GrowingAnalysisPanel from '../components/analysis/GrowingAnalysisPanel.jsx';
import DigitalTwinPanel from '../components/digital-twin/DigitalTwinPanel.jsx';
import PlantHistoryPanel from '../components/history/PlantHistoryPanel.jsx';
import MoistureChart from '../components/MoistureChart.jsx';
import Panel from '../components/common/Panel.jsx';
import { DEFAULT_PLANT_ID, getPlantById, plants } from '../data/plants.js';
import { getTelemetryByPlantId } from '../data/telemetry.js';
import { currentWeather } from '../data/weather.js';
import { computeIrrigationDecision } from '../data/decisions.js';
import { getHistoryByPlantId } from '../data/history.js';
import './Dashboard.css';

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
    <div className="dashboard-frame">
      <div className="dashboard-frame__inner">
        {/* 1. TOP: KPI & Status Summary Cards */}
        <MetricCards
          moisture={currentMoisture}
          idealMin={idealMin}
          idealMax={idealMax}
          pumpActive={decision?.trigger_pump || decision?.decision === 'WATER'}
        />

        {/* Demo Weather Simulation Controls */}
        <DemoWeatherControls />

        {/* 2. MIDDLE: 3-Column Macro Grid */}
        <div className="dashboard-grid">
          {/* Left: CentralPlantSystem (Plant card with Bael) + InventoryPanel */}
          <div className="dashboard-col">
            <CentralPlantSystem
              plant={selectedPlant}
              telemetry={telemetry}
              weather={weather}
              decision={decision}
            />
            <InventoryPanel
              selectedPlantId={selectedPlantId}
              onSelectPlant={setSelectedPlantId}
            />
          </div>

          {/* Center: GrowingAnalysisPanel (Telemetry + AI Decision + Pump + MoistureSparkline) */}
          <div className="dashboard-col dashboard-col--center">
            <GrowingAnalysisPanel
              plant={selectedPlant}
              telemetry={telemetry}
              weather={weather}
              decision={decision}
            />
          </div>

          {/* Right: DigitalTwinPanel (Plant health visualization) */}
          <div className="dashboard-col dashboard-col--right">
            <Panel className="digital-twin-card-container">
              <DigitalTwinPanel
                plant={selectedPlant}
                telemetry={telemetry}
              />
            </Panel>
          </div>
        </div>

        {/* 3. BOTTOM: PlantHistoryPanel */}
        <Panel className="dashboard-history-card dashboard-bottom">
          <PlantHistoryPanel
            plant={selectedPlant}
            telemetry={telemetry}
            decision={decision}
            history={history}
          />
        </Panel>

        {/* 4. BOTTOM: MoistureChart (Full width, 6-hour history) */}
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
  );
}
