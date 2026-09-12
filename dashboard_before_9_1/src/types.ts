// Types for backend API communication

export interface StatusResponse {
  status: string;
  total_decisions_logged: number;
  last_decision_at?: number;
}

export interface PlantProfile {
  species: string;
  scientificName?: string;
  idealMoistureMin: number;
  idealMoistureMax: number;
  growthStage?: string;
  wateringNotes?: string;
  confidence?: number;
}

export interface TelemetryRequest {
  soil_moisture_pct: number;
  temperature_c: number;
  humidity_pct: number;
  device_id: string;
}

export interface TelemetryResponse {
  trigger_pump: boolean;
  duration_sec: number;
  reason: string;
}

export interface IdentifyResponse {
  profile: PlantProfile;
}
