import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header.jsx';
import SystemOverview from './components/SystemOverview.jsx';
import PlantIdentification from './components/PlantIdentification.jsx';
import TelemetryControls from './components/TelemetryControls.jsx';
import DecisionPumpSection from './components/DecisionPumpSection.jsx';
import FlowIndicator from './components/FlowIndicator.jsx';
import DebugPanel from './components/DebugPanel.jsx';
import History from './components/History.jsx';
import SoilMoistureGraph from './components/SoilMoistureGraph.jsx';
import {
  fetchStatus,
  fetchLatestDecision,
  fetchPlantProfile,
  fetchWeather,
  onDebugLog,
} from './api';

export default function App() {
  const [backendOnline, setBackendOnline] = useState(false);
  const [esp32Online, setEsp32Online] = useState(false);
  const [statusData, setStatusData] = useState(null);
  const [latestDecision, setLatestDecision] = useState(null);
  const [plantProfile, setPlantProfile] = useState(null);
  const [weather, setWeather] = useState(null);
  const [isPolling, setIsPolling] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [debugLogs, setDebugLogs] = useState([]);
  const [checklist, setChecklist] = useState({
    backendConnected: false,
    plantIdentified: false,
    profileReceived: false,
    telemetrySent: false,
    aiDecisionReceived: false,
    weatherReceived: false,
    waterScenarioTested: false,
    noWaterScenarioTested: false,
  });

  // Subscribe to API debug logs
  useEffect(() => {
    const unsubscribe = onDebugLog((entry) => {
      setDebugLogs((logs) => [entry, ...logs].slice(0, 100));
    });
    return unsubscribe;
  }, []);

  // Helper to refresh status and decision
  const refreshAll = useCallback(async () => {
    setIsLoading(true);
    try {
      const [statusRes, decisionRes, profileRes, weatherRes] = await Promise.all([
        fetchStatus(),
        fetchLatestDecision(),
        fetchPlantProfile(),
        fetchWeather(),
      ]);

      if (statusRes.ok) {
        setBackendOnline(true);
        setStatusData(statusRes.data);
        setEsp32Online(Boolean(statusRes.data?.last_decision_at));
        setChecklist((c) => ({ ...c, backendConnected: true }));
      } else {
        setBackendOnline(false);
        setChecklist((c) => ({ ...c, backendConnected: false }));
      }

      if (decisionRes.ok) {
        setLatestDecision(decisionRes.data);
        setChecklist((c) => ({ ...c, aiDecisionReceived: true }));
      }

      if (profileRes.ok) {
        setPlantProfile(profileRes.data);
        setChecklist((c) => ({ ...c, profileReceived: true }));
      }

      if (weatherRes.ok) {
        setWeather(weatherRes.data);
        setChecklist((c) => ({ ...c, weatherReceived: true }));
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Polling effect
  useEffect(() => {
    if (!isPolling) return undefined;
    const interval = setInterval(() => {
      refreshAll();
    }, 5000);
    return () => clearInterval(interval);
  }, [isPolling, refreshAll]);

  // Callback after successful telemetry send
  const handleTelemetrySuccess = (payload, decision) => {
    setLatestDecision(decision);
    setChecklist((c) => ({ ...c, telemetrySent: true }));
    if (payload.soil_moisture_pct < 30) {
      setChecklist((c) => ({ ...c, waterScenarioTested: true }));
    } else {
      setChecklist((c) => ({ ...c, noWaterScenarioTested: true }));
    }
  };

  // Callback after plant identification success
  const handleIdentificationSuccess = (result) => {
    setChecklist((c) => ({ ...c, plantIdentified: true }));
    setChecklist((c) => ({ ...c, profileReceived: true }));
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans">
      <Header
        backendOnline={backendOnline}
        esp32Online={esp32Online}
        isPolling={isPolling}
        setIsPolling={setIsPolling}
        onRefresh={refreshAll}
        isLoading={isLoading}
      />

      <main className="flex-1 max-w-7xl mx-auto p-4 space-y-6">
        {/* System Overview */}
        <SystemOverview
          statusData={statusData}
          latestDecision={latestDecision}
          backendOnline={backendOnline}
          esp32Online={esp32Online}
        />

        {/* Plant Identification + Profile */}
        <PlantIdentification
          plantProfile={plantProfile}
          setPlantProfile={setPlantProfile}
          onIdentificationSuccess={handleIdentificationSuccess}
          backendOnline={backendOnline}
        />

        {/* Manual Telemetry Controls */}
        <TelemetryControls
          onTelemetrySuccess={handleTelemetrySuccess}
          backendOnline={backendOnline}
          currentProfile={plantProfile}
        />

        {/* Decision & Pump Section */}
        <DecisionPumpSection
          decisionData={latestDecision}
          latestDecision={latestDecision}
        />

        {/* Flow Indicator */}
        <FlowIndicator checklist={checklist} />

        {/* History Table */}
        <History />

        {/* Soil Moisture Graph */}
        <SoilMoistureGraph />

        {/* Debug Panel */}
        <DebugPanel logs={debugLogs} />
      </main>
    </div>
  );
}
