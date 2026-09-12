import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  getStatus,
  getPlantProfile,
  getWeather,
  getLatestDecision,
  getHistory,
  sendTelemetry,
  activatePump,
  identifyPlant,
  setDemoWeatherScenario,
  getUserPlants,
  getUserIrrigationHistory,
  getTelemetryHistory,
} from '../api.js';
import { plants } from '../data/plants.js';
import { HISTORY_EVENT_TYPES } from '../data/history.js';

export function buildActivePlant(profile) {
  if (!profile || !profile.species) {
    return plants[0];
  }

  const speciesLower = (profile.species || '').toLowerCase();
  const matched = plants.find((p) => {
    const nameLower = p.name.toLowerCase();
    const commonLower = (p.commonName || '').toLowerCase();
    const idLower = p.id.toLowerCase();
    return (
      speciesLower.includes(nameLower) ||
      nameLower.includes(speciesLower) ||
      speciesLower.includes(commonLower) ||
      commonLower.includes(speciesLower) ||
      speciesLower.includes(idLower)
    );
  });

  const idealMin = Array.isArray(profile.ideal_moisture_range_pct)
    ? profile.ideal_moisture_range_pct[0]
    : (profile.ideal_moisture_min ?? profile.idealMoistureMin ?? 40);
  const idealMax = Array.isArray(profile.ideal_moisture_range_pct)
    ? profile.ideal_moisture_range_pct[1]
    : (profile.ideal_moisture_max ?? profile.idealMoistureMax ?? 65);

  return {
    id: matched?.id || `plant-${profile.id || 'active'}`,
    name: profile.species,
    commonName: profile.scientific_name || profile.scientificName || matched?.commonName || 'Botanical Specimen',
    scientificName: profile.scientific_name || profile.scientificName || profile.species,
    description: profile.notes || profile.wateringNotes || matched?.description || 'Active plant care profile managed by backend AI reasoning.',
    growthStage: profile.growth_stage || profile.growthStage || matched?.growthStage || 'Vegetative Growth',
    week: matched?.week || 1,
    idealMoistureMin: idealMin,
    idealMoistureMax: idealMax,
    temperaturePreference: matched?.temperaturePreference || { min: 18, max: 30 },
    humidityPreference: matched?.humidityPreference || { min: 40, max: 70 },
    illustration: matched?.illustration || { shape: 'broadleaf', color: 'botanical' },
    confidence: profile.confidence,
    notes: profile.notes || profile.wateringNotes || '',
    rawProfile: profile,
  };
}

export function formatDecisionToTimelineEntry(item, index = 0) {
  const isWater = Boolean(item.trigger_pump || item.decision === 'WATER');
  const ts = item.timestamp ? (item.timestamp > 1e11 ? item.timestamp : item.timestamp * 1000) : Date.now();
  const dateObj = new Date(ts);
  const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const isToday = new Date().toDateString() === dateObj.toDateString();
  const label = `${isToday ? 'Today' : dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' })} \u00b7 ${timeStr}`;

  return {
    id: `hist-${item.id || index}-${ts}`,
    label,
    time: timeStr,
    type: isWater ? HISTORY_EVENT_TYPES.WATERED : HISTORY_EVENT_TYPES.NO_WATERING,
    eventLabel: isWater ? 'Watering triggered' : 'No watering',
    durationSec: item.duration_sec ?? (isWater ? 5 : 0),
    reason: item.reason || (isWater ? 'Irrigation triggered by backend AI.' : 'Moisture is within safe bounds; watering withheld.'),
    soilMoisture: Math.round(item.soil_moisture_pct ?? item.soil_moisture ?? 45),
    temperature: Math.round(item.temperature_c ?? item.temperature ?? item.temp ?? 24),
    humidity: Math.round(item.humidity_pct ?? item.humidity ?? 50),
    rainProbability: item.rainProbability ?? 0,
    trigger_pump: isWater,
    duration_sec: item.duration_sec ?? 0,
  };
}

const BioAgentContext = createContext(null);

export function BioAgentProvider({ children }) {
  const [backendStatus, setBackendStatus] = useState({
    status: 'checking',
    online: false,
    total_decisions_logged: 0,
    last_decision_at: null,
  });

  const [activeProfile, setActiveProfile] = useState(null);
  const [activePlant, setActivePlant] = useState(null);
  const [userPlants, setUserPlants] = useState([]);

  const [latestTelemetry, setLatestTelemetry] = useState({
    soilMoisture: 45,
    temperature: 24,
    humidity: 50,
    soil_moisture_pct: 45,
    temperature_c: 24,
    humidity_pct: 50,
    device_id: 'esp32-01',
    isLive: false,
    timestamp: Date.now(),
  });

  const [latestDecision, setLatestDecision] = useState({
    trigger_pump: false,
    duration_sec: 0,
    reason: 'Awaiting initial sensor telemetry from FastAPI backend...',
    decision: 'DO NOT WATER',
    timestamp: Date.now(),
  });

  const lastDecisionTimestampRef = useRef(null);

  const [isDemoMode, setIsDemoMode] = useState(() => {
    try {
      const savedUser = localStorage.getItem('bioagent_user');
      const parsed = savedUser ? JSON.parse(savedUser) : null;
      if (parsed?.username === 'demo') return true;
      return localStorage.getItem('bioagent_demo_mode') === 'true';
    } catch {
      return false;
    }
  });

  const [demoWeather, setDemoWeather] = useState({
    active: false,
    condition: 'Clear / Sunny',
    rainProbability: 5,
    temperature: 28,
    expectedRainfall: 0,
  });

  const toggleDemoMode = useCallback((forcedVal) => {
    setIsDemoMode((prev) => {
      const next = typeof forcedVal === 'boolean' ? forcedVal : !prev;
      localStorage.setItem('bioagent_demo_mode', next ? 'true' : 'false');
      return next;
    });
  }, []);

  const [weather, setWeather] = useState({
    available: false,
    rainProbability: null,
    expectedRainfall: null,
    temperature: 24,
    condition: 'Unavailable',
    error: null,
  });

  const [sessionHistory, setSessionHistory] = useState([]);
  const [telemetryHistory, setTelemetryHistory] = useState([]);
  const [loading, setLoading] = useState({
    initial: true,
    telemetry: false,
    identification: false,
    weather: false,
  });

  const [errors, setErrors] = useState({
    backend: null,
    telemetry: null,
    weather: null,
    identification: null,
  });

  // Refresh backend status
  const refreshStatus = useCallback(async () => {
    try {
      const data = await getStatus();
      setBackendStatus({
        ...data,
        online: true,
      });
      setErrors((prev) => ({ ...prev, backend: null }));
      return data;
    } catch (err) {
      setBackendStatus((prev) => ({ ...prev, online: false, status: 'offline' }));
      setErrors((prev) => ({ ...prev, backend: err.message }));
      return null;
    }
  }, []);

  // Refresh user plants from GET /user-plants
  const refreshUserPlants = useCallback(async () => {
    try {
      const res = await getUserPlants();
      if (res && Array.isArray(res.plants)) {
        const mapped = res.plants.map((p) => buildActivePlant(p));
        setUserPlants(mapped);
        if (mapped.length > 0) {
          setActivePlant((prev) => {
            const exists = prev && mapped.find((m) => m.id === prev.id || m.name === prev.name);
            return exists || mapped[0];
          });
        } else {
          setActivePlant(null);
        }
        return mapped;
      }
      setUserPlants([]);
      setActivePlant(null);
      return [];
    } catch (err) {
      console.warn('Could not fetch user plants:', err.message);
      setUserPlants([]);
      return [];
    }
  }, []);

  // Refresh plant profile
  const refreshPlantProfile = useCallback(async () => {
    try {
      const profile = await getPlantProfile();
      if (profile && profile.species) {
        setActiveProfile(profile);
        const derivedPlant = buildActivePlant(profile);
        setActivePlant(derivedPlant);
      }
      return profile;
    } catch (err) {
      setErrors((prev) => ({ ...prev, backend: err.message }));
      return null;
    }
  }, []);

  // Refresh weather
  const refreshWeather = useCallback(async () => {
    if (demoWeather.active) {
      setWeather({
        available: true,
        rainProbability: demoWeather.rainProbability,
        expectedRainfall: demoWeather.expectedRainfall,
        temperature: demoWeather.temperature,
        condition: demoWeather.condition,
        error: null,
        isDemo: true,
      });
      return;
    }
    setLoading((prev) => ({ ...prev, weather: true }));
    try {
      const data = await getWeather();
      if (data && data.max_rain_probability_pct !== null && !data.error) {
        setWeather({
          available: true,
          rainProbability: data.max_rain_probability_pct,
          expectedRainfall: data.expected_rain_mm_24h,
          temperature: data.temperature_c || latestTelemetry.temperature || 24,
          condition:
            data.condition ||
            (data.max_rain_probability_pct > 60
              ? 'Light Rain'
              : data.max_rain_probability_pct > 20
              ? 'Partly Cloudy'
              : 'Clear / Sunny'),
          error: null,
          isForced: Boolean(data.is_forced),
        });
        setErrors((prev) => ({ ...prev, weather: null }));
      } else {
        setWeather({
          available: false,
          rainProbability: null,
          expectedRainfall: null,
          temperature: latestTelemetry.temperature || 24,
          condition: 'Unavailable',
          error: data?.error || 'Weather data unavailable',
        });
      }
    } catch (err) {
      setWeather({
        available: false,
        rainProbability: null,
        expectedRainfall: null,
        temperature: latestTelemetry.temperature || 24,
        condition: 'Unavailable',
        error: err.message,
      });
      setErrors((prev) => ({ ...prev, weather: 'Weather data unavailable' }));
    } finally {
      setLoading((prev) => ({ ...prev, weather: false }));
    }
  }, [demoWeather, latestTelemetry.temperature]);

  // Handle manual pump activation via POST /pump/activate
  const handleActivatePump = useCallback(
    async (customPayload = {}) => {
      setLoading((prev) => ({ ...prev, telemetry: true }));
      try {
        const res = await activatePump({
          duration_sec: customPayload.duration_sec ?? latestDecision.duration_sec ?? 5,
          reason: customPayload.reason || 'Manual pump activation requested via dashboard',
          soil_moisture: customPayload.soil_moisture ?? latestTelemetry.soilMoisture,
        });

        const nowMs = Date.now();
        lastDecisionTimestampRef.current = nowMs / 1000;

        const updatedDec = {
          trigger_pump: true,
          duration_sec: res.duration_sec ?? 5,
          reason: res.reason,
          decision: 'WATER',
          timestamp: nowMs,
        };
        setLatestDecision(updatedDec);

        const timelineEntry = {
          id: `manual-pump-${nowMs}`,
          timestamp: nowMs / 1000,
          time: new Date(nowMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          label: `Just now · ${new Date(nowMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
          type: HISTORY_EVENT_TYPES.WATERED,
          eventLabel: 'Watering triggered',
          durationSec: res.duration_sec ?? 5,
          reason: res.reason,
          soilMoisture: Math.round(res.soil_moisture ?? latestTelemetry.soilMoisture),
          temperature: Math.round(res.temp ?? 24),
          humidity: Math.round(res.humidity ?? 50),
          rainProbability: weather.rainProbability ?? 0,
          trigger_pump: true,
          duration_sec: res.duration_sec ?? 5,
        };

        setSessionHistory((prev) => [timelineEntry, ...prev]);
        setTelemetryHistory((prev) => [
          ...prev.slice(-359),
          {
            timestamp: nowMs,
            moisture: Math.round(res.soil_moisture ?? latestTelemetry.soilMoisture),
            soil_moisture: Math.round(res.soil_moisture ?? latestTelemetry.soilMoisture),
            temperature: Math.round(res.temp ?? 24),
            humidity: Math.round(res.humidity ?? 50),
            trigger_pump: true,
            pump: true,
            reason: res.reason,
          }
        ]);
        refreshStatus();
        return res;
      } catch (err) {
        setErrors((prev) => ({ ...prev, telemetry: err.message }));
        throw err;
      } finally {
        setLoading((prev) => ({ ...prev, telemetry: false }));
      }
    },
    [latestDecision.duration_sec, latestTelemetry.soilMoisture, weather.rainProbability, refreshStatus]
  );

  // Handle sending telemetry
  const handleSendTelemetry = useCallback(
    async (payload) => {
      setLoading((prev) => ({ ...prev, telemetry: true }));
      setErrors((prev) => ({ ...prev, telemetry: null }));

      try {
        const decisionRes = await sendTelemetry(payload);
        const nowMs = Date.now();
        lastDecisionTimestampRef.current = nowMs / 1000;

        const newTelemetry = {
          soilMoisture: payload.soil_moisture_pct,
          temperature: payload.temperature_c,
          humidity: payload.humidity_pct,
          soil_moisture_pct: payload.soil_moisture_pct,
          temperature_c: payload.temperature_c,
          humidity_pct: payload.humidity_pct,
          device_id: payload.device_id || 'esp32-01',
          timestamp: nowMs,
          isLive: true,
        };
        setLatestTelemetry(newTelemetry);

        const decisionText = decisionRes.trigger_pump ? 'WATER' : 'DO NOT WATER';
        const formattedDecision = {
          trigger_pump: Boolean(decisionRes.trigger_pump),
          duration_sec: decisionRes.duration_sec ?? 0,
          reason: decisionRes.reason,
          decision: decisionText,
          timestamp: nowMs,
        };
        setLatestDecision(formattedDecision);

        const sessionEntry = {
          id: `session-${nowMs}`,
          timestamp: nowMs / 1000,
          time: new Date(nowMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          label: `Just now · ${new Date(nowMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
          type: decisionRes.trigger_pump ? HISTORY_EVENT_TYPES.WATERED : HISTORY_EVENT_TYPES.NO_WATERING,
          eventLabel: decisionRes.trigger_pump ? 'Watering triggered' : 'No watering',
          durationSec: decisionRes.duration_sec ?? 0,
          reason: decisionRes.reason,
          soilMoisture: Math.round(payload.soil_moisture_pct),
          temperature: Math.round(payload.temperature_c),
          humidity: Math.round(payload.humidity_pct),
          rainProbability: weather.rainProbability,
          trigger_pump: Boolean(decisionRes.trigger_pump),
          duration_sec: decisionRes.duration_sec ?? 0,
          soil_moisture_pct: payload.soil_moisture_pct,
          temperature_c: payload.temperature_c,
          humidity_pct: payload.humidity_pct,
        };

        setSessionHistory((prev) => [sessionEntry, ...prev]);
        setTelemetryHistory((prev) => [
          ...prev.slice(-359),
          {
            timestamp: nowMs,
            moisture: payload.soil_moisture_pct,
            soil_moisture: payload.soil_moisture_pct,
            temperature: payload.temperature_c,
            humidity: payload.humidity_pct,
            trigger_pump: Boolean(decisionRes.trigger_pump),
            pump: Boolean(decisionRes.trigger_pump),
            reason: decisionRes.reason,
          }
        ]);
        refreshStatus();
        return formattedDecision;
      } catch (err) {
        setErrors((prev) => ({ ...prev, telemetry: err.message }));
        throw err;
      } finally {
        setLoading((prev) => ({ ...prev, telemetry: false }));
      }
    },
    [weather.rainProbability, refreshStatus]
  );

  // Handle plant identification
  const handleIdentifyPlant = useCallback(
    async (file) => {
      setLoading((prev) => ({ ...prev, identification: true }));
      setErrors((prev) => ({ ...prev, identification: null }));

      try {
        const idResult = await identifyPlant(file);
        await refreshPlantProfile();
        await refreshUserPlants();
        return idResult;
      } catch (err) {
        setErrors((prev) => ({ ...prev, identification: err.message }));
        throw err;
      } finally {
        setLoading((prev) => ({ ...prev, identification: false }));
      }
    },
    [refreshPlantProfile, refreshUserPlants]
  );

  // Update demo weather with live simulation and automatic re-evaluation of AI Irrigation Recommendation
  const updateDemoWeather = useCallback(
    async (updates) => {
      const nextDemoWeather = {
        ...demoWeather,
        ...updates,
        active: true,
      };
      setDemoWeather(nextDemoWeather);

      // 1. Immediately update active weather state in context for instant UI feedback
      const nextWeatherState = {
        available: true,
        rainProbability: Number(nextDemoWeather.rainProbability),
        expectedRainfall: Number(nextDemoWeather.expectedRainfall),
        temperature: Number(nextDemoWeather.temperature),
        condition: nextDemoWeather.condition,
        error: null,
        isDemo: true,
      };
      setWeather(nextWeatherState);

      // 2. Notify backend of demo weather scenario override
      try {
        await setDemoWeatherScenario({
          scenario: 'custom',
          condition: nextDemoWeather.condition,
          rain_probability_pct: Number(nextDemoWeather.rainProbability),
          max_rain_probability_pct: Number(nextDemoWeather.rainProbability),
          expected_rain_mm_24h: Number(nextDemoWeather.expectedRainfall),
          expected_rainfall_mm: Number(nextDemoWeather.expectedRainfall),
          temperature_c: Number(nextDemoWeather.temperature),
        });
      } catch (e) {
        console.warn('Backend weather scenario update failed:', e);
      }

      // 3. Automatic re-evaluation of AI Irrigation Recommendation
      const currentMoisture = Number(
        latestTelemetry?.soilMoisture ?? latestTelemetry?.soil_moisture_pct ?? 45
      );
      const plantMin = Number(activePlant?.idealMoistureMin ?? 40);
      const plantMax = Number(activePlant?.idealMoistureMax ?? 60);

      // Instant client decision update
      if (nextWeatherState.rainProbability >= 60 || nextWeatherState.expectedRainfall >= 3.0) {
        if (currentMoisture >= 25) {
          setLatestDecision({
            trigger_pump: false,
            duration_sec: 0,
            reason: `Watering Suspended: Rain Predicted (${nextWeatherState.rainProbability}% rain probability, ${nextWeatherState.expectedRainfall}mm expected). Soil moisture at ${currentMoisture}% will be replenished naturally.`,
            decision: 'DO NOT WATER',
            timestamp: Date.now(),
          });
        }
      } else if (currentMoisture < plantMin) {
        const deficit = plantMin - currentMoisture;
        const duration = Math.min(30, Math.max(5, Math.round(deficit * 0.8)));
        setLatestDecision({
          trigger_pump: true,
          duration_sec: duration,
          reason: `Optimal irrigation triggered: Soil moisture (${currentMoisture}%) below ideal minimum (${plantMin}%). Forecast is ${nextWeatherState.condition} with low rain probability (${nextWeatherState.rainProbability}%).`,
          decision: 'WATER',
          timestamp: Date.now(),
        });
      } else {
        setLatestDecision({
          trigger_pump: false,
          duration_sec: 0,
          reason: `Soil moisture (${currentMoisture}%) is within target range (${plantMin}%–${plantMax}%). No irrigation required under ${nextWeatherState.condition}.`,
          decision: 'DO NOT WATER',
          timestamp: Date.now(),
        });
      }

      // 4. Trigger backend Groq AI re-evaluation in background
      try {
        await handleSendTelemetry({
          soil_moisture_pct: currentMoisture,
          temperature_c: nextWeatherState.temperature,
          humidity_pct: latestTelemetry.humidity || 50,
          device_id: 'demo-weather-sim',
          demo_weather_override: {
            condition: nextWeatherState.condition,
            max_rain_probability_pct: nextWeatherState.rainProbability,
            expected_rain_mm_24h: nextWeatherState.expectedRainfall,
            temperature_c: nextWeatherState.temperature,
          },
        });
      } catch (e) {
        // Handled silently
      }
    },
    [demoWeather, latestTelemetry, activePlant, handleSendTelemetry]
  );

  // Apply quick weather presets
  const applyWeatherPreset = useCallback(
    async (preset) => {
      switch (preset) {
        case 'sunny':
        case 'clear':
          await updateDemoWeather({
            condition: 'Clear / Sunny',
            rainProbability: 5,
            temperature: 30,
            expectedRainfall: 0,
          });
          break;
        case 'rain':
          await updateDemoWeather({
            condition: 'Light Rain',
            rainProbability: 75,
            temperature: 22,
            expectedRainfall: 8.5,
          });
          break;
        case 'storm':
        case 'thunderstorm':
          await updateDemoWeather({
            condition: 'Heavy Thunderstorm',
            rainProbability: 95,
            temperature: 19,
            expectedRainfall: 24.0,
          });
          break;
        case 'cloudy':
          await updateDemoWeather({
            condition: 'Cloudy',
            rainProbability: 35,
            temperature: 24,
            expectedRainfall: 0.8,
          });
          break;
        case 'heatwave':
          await updateDemoWeather({
            condition: 'Heatwave',
            rainProbability: 0,
            temperature: 39,
            expectedRainfall: 0,
          });
          break;
        case 'reset':
        case 'off':
          setDemoWeather({
            active: false,
            condition: 'Clear / Sunny',
            rainProbability: 5,
            temperature: 24,
            expectedRainfall: 0,
          });
          try {
            await setDemoWeatherScenario('off');
            await refreshWeather();
          } catch (e) {
            console.warn('Weather reset failed:', e);
          }
          break;
        default:
          break;
      }
    },
    [updateDemoWeather, refreshWeather]
  );

  // Handle weather demo scenario
  const handleDemoWeatherScenario = useCallback(
    async (scenario) => {
      if (typeof scenario === 'string') {
        await applyWeatherPreset(scenario);
      } else {
        await updateDemoWeather(scenario);
      }
    },
    [applyWeatherPreset, updateDemoWeather]
  );

  // Transient Pump Timer: Auto-Revert after duration_sec
  useEffect(() => {
    if (latestDecision?.trigger_pump && (latestDecision?.duration_sec ?? 0) > 0) {
      const timer = setTimeout(() => {
        setLatestDecision((prev) => ({
          ...prev,
          trigger_pump: false,
          decision: 'DO NOT WATER',
        }));
      }, latestDecision.duration_sec * 1000);

      return () => clearTimeout(timer);
    }
  }, [latestDecision?.trigger_pump, latestDecision?.duration_sec, latestDecision?.timestamp]);

  // Initial load on mount and Background Polling (5s interval)
  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        await refreshStatus();
        await refreshPlantProfile();
        await refreshWeather();
        await refreshUserPlants();

        // Fetch latest decision and history
        try {
          const latDec = await getLatestDecision();
          if (mounted && latDec && latDec.id) {
            const rawTs = latDec.timestamp;
            lastDecisionTimestampRef.current = rawTs;
            const decTimestamp = rawTs ? (rawTs > 1e11 ? rawTs : rawTs * 1000) : Date.now();
            setLatestTelemetry({
              soilMoisture: latDec.soil_moisture_pct,
              temperature: latDec.temperature_c,
              humidity: latDec.humidity_pct,
              soil_moisture_pct: latDec.soil_moisture_pct,
              temperature_c: latDec.temperature_c,
              humidity_pct: latDec.humidity_pct,
              device_id: latDec.device_id,
              timestamp: decTimestamp,
              isLive: true,
            });
            setLatestDecision({
              trigger_pump: Boolean(latDec.trigger_pump),
              duration_sec: latDec.duration_sec,
              reason: latDec.reason,
              decision: latDec.trigger_pump ? 'WATER' : 'DO NOT WATER',
              timestamp: decTimestamp,
            });
          }
        } catch (e) {
          console.warn('Could not fetch latest decision:', e);
        }

        // Fetch user's irrigation history (limit=50)
        try {
          const userHistRes = await getUserIrrigationHistory(50);
          if (mounted && userHistRes && Array.isArray(userHistRes.history) && userHistRes.history.length > 0) {
            const formatted = userHistRes.history.map((item, idx) =>
              formatDecisionToTimelineEntry(item, idx)
            );
            setSessionHistory(formatted);
          } else {
            const histRes = await getHistory(50);
            if (mounted && histRes && Array.isArray(histRes.history) && histRes.history.length > 0) {
              const formatted = histRes.history.reverse().map((item, idx) =>
                formatDecisionToTimelineEntry(item, idx)
              );
              setSessionHistory(formatted);
            }
          }
        } catch (e) {
          console.warn('Could not fetch initial history:', e);
        }

        // Fetch recent telemetry history (limit=360 for 6h analytics)
        try {
          const telemHistRes = await getTelemetryHistory(360);
          if (mounted && telemHistRes && Array.isArray(telemHistRes.telemetry)) {
            setTelemetryHistory(telemHistRes.telemetry);
          }
        } catch (e) {
          console.warn('Could not fetch telemetry history:', e);
        }
      } catch (e) {
        console.error('Initialization error:', e);
      } finally {
        if (mounted) {
          setLoading((prev) => ({ ...prev, initial: false }));
        }
      }
    }

    init();

    // Background Polling (5s Interval)
    const intervalId = setInterval(async () => {
      if (!mounted) return;
      try {
        await refreshStatus();
        const latDec = await getLatestDecision();
        if (mounted && latDec && latDec.id && latDec.timestamp != null) {
          if (latDec.timestamp !== lastDecisionTimestampRef.current) {
            lastDecisionTimestampRef.current = latDec.timestamp;
            const decTimestamp = latDec.timestamp > 1e11 ? latDec.timestamp : latDec.timestamp * 1000;
            const newMoisture = latDec.soil_moisture_pct;
            setLatestTelemetry({
              soilMoisture: newMoisture,
              temperature: latDec.temperature_c,
              humidity: latDec.humidity_pct,
              soil_moisture_pct: newMoisture,
              temperature_c: latDec.temperature_c,
              humidity_pct: latDec.humidity_pct,
              device_id: latDec.device_id,
              timestamp: decTimestamp,
              isLive: true,
            });
            setLatestDecision({
              trigger_pump: Boolean(latDec.trigger_pump),
              duration_sec: latDec.duration_sec,
              reason: latDec.reason,
              decision: latDec.trigger_pump ? 'WATER' : 'DO NOT WATER',
              timestamp: decTimestamp,
            });

            // Update sparkline and 6h chart telemetry history
            setTelemetryHistory((prev) => [
              ...prev.slice(-359),
              {
                timestamp: decTimestamp,
                moisture: newMoisture,
                soil_moisture: newMoisture,
                temperature: latDec.temperature_c,
                humidity: latDec.humidity_pct,
                trigger_pump: Boolean(latDec.trigger_pump),
                pump: Boolean(latDec.trigger_pump),
                reason: latDec.reason,
              }
            ]);

            const timelineEntry = formatDecisionToTimelineEntry(latDec);
            setSessionHistory((prev) => {
              if (prev.some((h) => h.id.includes(String(latDec.id)))) {
                return prev;
              }
              return [timelineEntry, ...prev];
            });
          }
        }
      } catch (err) {
        console.warn('Background polling error:', err);
      }
    }, 5000);

    return () => {
      mounted = false;
      clearInterval(intervalId);
    };
  }, [refreshStatus, refreshPlantProfile, refreshWeather, refreshUserPlants]);

  const value = {
    isDemoMode,
    setIsDemoMode,
    toggleDemoMode,
    demoWeather,
    updateDemoWeather,
    applyWeatherPreset,
    backendStatus,
    activeProfile,
    activePlant,
    setActivePlant,
    userPlants,
    latestTelemetry,
    latestDecision,
    weather,
    sessionHistory,
    telemetryHistory,
    loading,
    errors,
    refreshStatus,
    refreshPlantProfile,
    refreshUserPlants,
    refreshWeather,
    handleActivatePump,
    handleSendTelemetry,
    handleIdentifyPlant,
    handleDemoWeatherScenario,
  };

  return <BioAgentContext.Provider value={value}>{children}</BioAgentContext.Provider>;
}

export function useBioAgent() {
  const context = useContext(BioAgentContext);
  if (!context) {
    throw new Error('useBioAgent must be used within a BioAgentProvider');
  }
  return context;
}
