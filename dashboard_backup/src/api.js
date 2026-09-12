/**
 * BioAgent AI API Client
 * Centralized API service with debug logging and latency tracking.
 */

let apiBaseUrl = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL)
  ? import.meta.env.VITE_API_BASE_URL.replace(/\/$/, '')
  : 'http://localhost:8000';

let debugListeners = [];

export function setApiBaseUrl(url) {
  apiBaseUrl = (url || 'http://localhost:8000').replace(/\/$/, '');
}

export function getApiBaseUrl() {
  return apiBaseUrl;
}

export function onDebugLog(callback) {
  debugListeners.push(callback);
  return () => {
    debugListeners = debugListeners.filter(cb => cb !== callback);
  };
}

function notifyDebug(entry) {
  debugListeners.forEach(cb => {
    try {
      cb(entry);
    } catch (e) {
      console.error('Debug listener error:', e);
    }
  });
}

async function apiRequest(endpoint, options = {}) {
  const url = `${apiBaseUrl}${endpoint}`;
  const startTime = performance.now();
  const method = options.method || 'GET';
  let requestBody = null;

  if (options.body) {
    if (typeof options.body === 'string') {
      try {
        requestBody = JSON.parse(options.body);
      } catch {
        requestBody = options.body;
      }
    } else if (options.body instanceof FormData) {
      requestBody = '[Multipart FormData File Upload]';
    } else {
      requestBody = options.body;
    }
  }

  try {
    const response = await fetch(url, options);
    const latency = Math.round(performance.now() - startTime);
    let data;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    const debugEntry = {
      timestamp: new Date().toISOString(),
      endpoint,
      url,
      method,
      status: response.status,
      ok: response.ok,
      latencyMs: latency,
      requestPayload: requestBody,
      responsePayload: data,
      error: response.ok ? null : `HTTP ${response.status}: ${typeof data === 'string' ? data : JSON.stringify(data)}`
    };
    notifyDebug(debugEntry);

    if (!response.ok) {
      throw new Error(`API error (${response.status}): ${typeof data === 'string' ? data : JSON.stringify(data)}`);
    }

    return { ok: true, data, status: response.status, latencyMs: latency };
  } catch (err) {
    const latency = Math.round(performance.now() - startTime);
    const debugEntry = {
      timestamp: new Date().toISOString(),
      endpoint,
      url,
      method,
      status: 0,
      ok: false,
      latencyMs: latency,
      requestPayload: requestBody,
      responsePayload: null,
      error: err.message || 'Network / Connection Error'
    };
    notifyDebug(debugEntry);
    return { ok: false, error: err.message || 'Network Error', latencyMs: latency };
  }
}

export async function fetchStatus() {
  return apiRequest('/status');
}

export async function fetchLatestDecision() {
  return apiRequest('/latest-decision');
}

export async function fetchHistory(limit = 30) {
  return apiRequest(`/history?limit=${limit}`);
}

export async function fetchWeather() {
  return apiRequest('/weather');
}

export async function fetchPlantProfile() {
  return apiRequest('/plant-profile');
}

export async function identifyPlant(fileOrBlob) {
  const formData = new FormData();
  formData.append('file', fileOrBlob, 'plant_photo.jpg');

  return apiRequest('/identify-plant', {
    method: 'POST',
    body: formData,
  });
}

export async function sendTelemetry(telemetryData) {
  return apiRequest('/telemetry', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      soil_moisture_pct: Number(telemetryData.soil_moisture_pct),
      temperature_c: Number(telemetryData.temperature_c),
      humidity_pct: Number(telemetryData.humidity_pct),
      device_id: telemetryData.device_id || 'esp32-01',
    }),
  });
}

export async function setWeatherScenario(scenario) {
  return apiRequest('/demo/weather-scenario', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ scenario }),
  });
}
