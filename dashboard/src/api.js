/**
 * BioAgent AI — api.js / api.ts
 * Centralized API client for communicating with the FastAPI backend.
 */

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

/**
 * Returns active authentication token from localStorage
 */
export function getToken() {
  return localStorage.getItem('auth_token') || localStorage.getItem('bioagent_token') || null;
}

/**
 * Generic fetch wrapper with automatic JWT injection and 401 interception
 */
export async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = { ...(options.headers || {}) };

  const token = getToken();
  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
      if (res.status === 401) {
        // Clear invalid or expired session tokens
        localStorage.removeItem('auth_token');
        localStorage.removeItem('bioagent_token');
        localStorage.removeItem('bioagent_user');
        if (window.location.pathname !== '/login' && window.location.pathname !== '/' && window.location.pathname !== '/demo') {
          window.location.href = '/login';
        }
      }

      let message = `HTTP ${res.status} ${res.statusText}`;
      try {
        const errJson = await res.json();
        if (errJson && errJson.detail) {
          message = typeof errJson.detail === 'string' ? errJson.detail : JSON.stringify(errJson.detail);
        } else if (errJson && errJson.message) {
          message = errJson.message;
        }
      } catch {
        const text = await res.text();
        if (text) message = text;
      }
      throw new Error(`Request to ${endpoint} failed: ${message}`);
    }
    return await res.json();
  } catch (err) {
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      throw new Error(`Backend offline or unreachable at ${API_BASE_URL}`);
    }
    throw err;
  }
}

/**
 * Status & Health
 */
export async function getStatus() {
  return await request('/status');
}

/**
 * Active Reasoning Plant Profile
 */
export async function getPlantProfile() {
  return await request('/plant-profile');
}

/**
 * Telemetry Ingestion & AI Decision
 */
export async function sendTelemetry(payload, weatherOverride = null) {
  const bodyData = {
    device_id: payload.device_id || 'esp32-01',
    soil_moisture_pct: Number(payload.soil_moisture_pct),
    temperature_c: Number(payload.temperature_c),
    humidity_pct: Number(payload.humidity_pct),
  };
  if (weatherOverride || payload.demo_weather_override) {
    bodyData.demo_weather_override = weatherOverride || payload.demo_weather_override;
  }
  return await request('/telemetry', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(bodyData),
  });
}

/**
 * Manual Pump Activation Relay Trigger
 */
export async function activatePump(payload = {}) {
  return await request('/pump/activate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      duration_sec: payload.duration_sec ?? 5,
      reason: payload.reason || 'Manual pump activation requested via dashboard',
      plant_id: payload.plant_id ?? null,
      soil_moisture: payload.soil_moisture ?? null,
    }),
  });
}

/**
 * Plant Identification via Image Upload
 */
export async function identifyPlant(file, plantId = null) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('image', file);
  if (plantId) {
    const cleanId = String(plantId).replace('plant-', '');
    formData.append('plant_id', cleanId);
  }
  return await request('/identify-plant', {
    method: 'POST',
    body: formData,
  });
}

/**
 * Plant Health Specimen Visual Diagnostics
 */
export async function uploadPlantHealthImage(file, plantId = null) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('image', file);
  if (plantId) {
    const cleanId = String(plantId).replace('plant-', '');
    formData.append('plant_id', cleanId);
  }
  return await request('/plant-health/upload', {
    method: 'POST',
    body: formData,
  });
}

/**
 * Weather Forecast
 */
export async function getWeather() {
  return await request('/weather');
}

/**
 * Latest Decision Log
 */
export async function getLatestDecision() {
  return await request('/latest-decision');
}

/**
 * Historical Decision Logs
 */
export async function getHistory(limit = 20) {
  return await request(`/history?limit=${limit}`);
}

/**
 * Weather Scenario Override for Live Demonstrations
 */
export async function setDemoWeatherScenario(scenario) {
  const payload = typeof scenario === 'string' ? { scenario } : (scenario || {});
  return await request('/demo/weather-scenario', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

/**
 * Authentication Endpoints
 */
export async function loginUser(username, password) {
  return await request('/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password }),
  });
}

export async function signupUser(username, email, password) {
  return await request('/auth/signup', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, email, password }),
  });
}

export async function verifyAuthToken(token) {
  return await request('/auth/verify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ token }),
  });
}

/**
 * Per-User Plant List & History
 */
export async function getUserPlants() {
  return await request('/user-plants');
}

export async function getUserIrrigationHistory(limit = 50) {
  return await request(`/irrigation-history?limit=${limit}`);
}

export async function getTelemetryHistory(limit = 24) {
  return await request(`/telemetry-history?limit=${limit}`);
}

export { API_BASE_URL };
