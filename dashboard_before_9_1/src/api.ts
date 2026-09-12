const BASE_URL = 'http://localhost:8000';

/**
 * Fetch the current plant profile from the backend.
 */
export async function getPlantProfile() {
  const res = await fetch(`${BASE_URL}/plant-profile`);
  if (!res.ok) throw new Error('Failed to fetch plant profile');
  return res.json();
}

/**
 * Identify a plant by uploading an image file.
 * @param file The image file to upload.
 */
export async function identifyPlant(file: File) {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${BASE_URL}/identify-plant`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) throw new Error('Plant identification failed');
  return res.json();
}

/**
 * Get the recent moisture history used for the chart.
 */
export async function getMoistureHistory() {
  const res = await fetch(`${BASE_URL}/history?limit=20`);
  if (!res.ok) throw new Error('Failed to fetch history');
  const data = await res.json();
  // The backend returns {history: [...]}. Convert to the shape expected by the chart.
  return data.history.map((d: any) => ({
    time: new Date(d.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    moisture: d.soil_moisture_pct,
    pump: d.decision.trigger_pump,
  }));
}

/**
 * Get the current system status (used for health checks).
 */
export async function getStatus() {
  const res = await fetch(`${BASE_URL}/status`);
  if (!res.ok) throw new Error('Failed to fetch status');
  return res.json();
}