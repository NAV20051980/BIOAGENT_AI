// Current-conditions weather mock, shared across the whole dashboard rather
// than per-plant — all plants sit in the same greenhouse/location, so one
// reading applies to all of them. This is intentionally separate from
// `telemetry.js` (per-plant soil/climate sensors) and from `plants.js`
// (plant identity). The Level 7 Weather page is expected to read from this
// same module so the dashboard and the dedicated weather view never
// disagree, and it's shaped to be a drop-in replacement for a future
// OpenWeather API response.

export const currentWeather = {
  condition: 'Partly Cloudy',
  temperature: 26,
  rainProbability: 24,
  expectedRainfall: 1.2,
}

// 5-day mock forecast, same shared-location assumption as `currentWeather`.
// Kept in the same module (rather than a separate `forecast.js`) since it's
// the same "one weather reading source" concern, just projected forward —
// a future OpenWeather integration would return both from one call. Hand
// picked, not randomized, so the Weather page tells a consistent short story
// (a dry stretch easing into rain by the weekend) across a full page reload.
export const forecast = [
  { day: 'Today', condition: 'Partly Cloudy', high: 28, low: 19, rainProbability: 24 },
  { day: 'Tomorrow', condition: 'Sunny', high: 30, low: 20, rainProbability: 10 },
  { day: 'Wednesday', condition: 'Sunny', high: 31, low: 21, rainProbability: 8 },
  { day: 'Thursday', condition: 'Cloudy', high: 27, low: 20, rainProbability: 38 },
  { day: 'Friday', condition: 'Light Rain', high: 24, low: 18, rainProbability: 72 },
]
