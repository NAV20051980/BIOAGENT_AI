export const sensorData = {
  soilMoisture: 33,
  soilRaw: 2841,
  temperature: 23,
  humidity: 49,
  deviceId: "ESP32-BA-001",
  lastReceived: "2026-09-12 11:42:07",
};

export const weatherData = {
  rainProbability: 0,
  expectedRainfall: 0,
  condition: "Clear Sky",
  forecast: "No precipitation expected in the next 24 hours. Dry conditions will persist.",
  naturalWatering: false,
};

export const plantData = {
  commonName: "Bael",
  scientificName: "Aegle marmelos",
  confidence: 29.8,
  idealMoistureMin: 40,
  idealMoistureMax: 60,
  growthStage: "Active vegetative growth",
  wateringNotes: "Requires consistent moisture during growth phase. Avoid waterlogging.",
};

export const aiDecision = {
  decision: "WATER" as "WATER" | "DO_NOT_WATER",
  duration: 15,
  reason: "Current soil moisture is 33%, below the Bael ideal range of 40–60%. No rain is forecast, so irrigation is required to prevent stress.",
  timestamp: "2026-09-12 11:42:09",
};

export const moistureHistory = [
  { time: "10:00", moisture: 33, pump: false },
  { time: "10:15", moisture: 31, pump: false },
  { time: "10:30", moisture: 29, pump: false },
  { time: "10:45", moisture: 27, pump: false },
  { time: "11:00", moisture: 27, pump: true },
  { time: "11:15", moisture: 41, pump: false },
  { time: "11:30", moisture: 44, pump: false },
  { time: "11:45", moisture: 42, pump: false },
  { time: "12:00", moisture: 40, pump: false },
];

export const irrigationHistory = [
  { time: "11:42", plant: "Bael", moisture: 33, rainProb: 0, decision: "WATER", duration: "15s", safety: "APPROVED" },
  { time: "09:15", plant: "Bael", moisture: 38, rainProb: 5, decision: "DO NOT WATER", duration: "—", safety: "N/A" },
  { time: "07:30", plant: "Bael", moisture: 28, rainProb: 0, decision: "WATER", duration: "20s", safety: "APPROVED" },
  { time: "Yesterday 18:00", plant: "Bael", moisture: 55, rainProb: 40, decision: "DO NOT WATER", duration: "—", safety: "N/A" },
];

export const scenarios = [
  {
    id: "dry-no-rain",
    label: "Dry + No Rain",
    color: "#ef4444",
    moisture: 28,
    rainProb: 0,
    rainfall: 0,
    decision: "WATER",
    duration: 20,
    reason: "Critically low soil moisture with no rainfall expected. Immediate irrigation needed.",
  },
  {
    id: "wet-soil",
    label: "Wet Soil",
    color: "#10b981",
    moisture: 65,
    rainProb: 0,
    rainfall: 0,
    decision: "DO NOT WATER",
    duration: 0,
    reason: "Soil moisture exceeds ideal maximum (60%). No irrigation needed to avoid waterlogging.",
  },
  {
    id: "dry-rain",
    label: "Dry + Rain",
    color: "#f59e0b",
    moisture: 30,
    rainProb: 75,
    rainfall: 8,
    decision: "DO NOT WATER",
    duration: 0,
    reason: "Soil is dry but significant rainfall is forecast. Natural precipitation will suffice.",
  },
  {
    id: "critical",
    label: "Critical Dryness",
    color: "#ef4444",
    moisture: 15,
    rainProb: 0,
    rainfall: 0,
    decision: "WATER",
    duration: 30,
    reason: "Severe moisture deficit. Plant is at risk. Maximum safe irrigation duration applied.",
  },
];
