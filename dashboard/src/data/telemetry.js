// Live sensor readings, kept deliberately separate from plant identity
// (`plants.js`). This models what an ESP32 soil/climate sensor would report
// for a given plant right now. Weather/forecast data (rain probability,
// expected rainfall) is a distinct concern — it belongs with a future
// `weather.js` module, not here, so this file stays a clean drop-in for a
// future `GET /api/plants/:id/telemetry` response.
//
// Values are hand-picked mock data, not randomized, so the demo is
// reproducible: some plants read healthy, some read stressed, so the digital
// twin's condition states are all reachable without waiting on live data.
// The initially-selected plant (Aglaonema) reads healthy by default.

export const telemetryByPlantId = {
  aglaonema: { soilMoisture: 52, temperature: 23, humidity: 55 },
  monstera: { soilMoisture: 58, temperature: 25, humidity: 62 },
  'snake-plant': { soilMoisture: 28, temperature: 24, humidity: 40 },
  'peace-lily': { soilMoisture: 34, temperature: 22, humidity: 48 },
  pothos: { soilMoisture: 31, temperature: 26, humidity: 38 },
  'zz-plant': { soilMoisture: 30, temperature: 25, humidity: 42 },
  'spider-plant': { soilMoisture: 44, temperature: 21, humidity: 52 },
  philodendron: { soilMoisture: 18, temperature: 27, humidity: 35 },
  'rubber-plant': { soilMoisture: 16, temperature: 23, humidity: 47 },
  calathea: { soilMoisture: 60, temperature: 22, humidity: 66 },
  'areca-palm': { soilMoisture: 12, temperature: 29, humidity: 30 },
  'aloe-vera': { soilMoisture: 22, temperature: 24, humidity: 33 },
}

export function getTelemetryByPlantId(plantId) {
  return telemetryByPlantId[plantId] ?? null
}
