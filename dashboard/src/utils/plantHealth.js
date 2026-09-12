// Shared plant-condition logic.
//
// Converts a plant's ideal environmental ranges + its current telemetry
// reading into one of five condition states. Soil moisture is the primary
// driver (per product spec); temperature and humidity are secondary and can
// only push the state one notch worse, never better, and never past
// CRITICAL. This function is intentionally the single source of truth for
// "how healthy is this plant right now" so the Level 4 digital twin and the
// future Level 5 growing-analysis panel can both call it and always agree.

export const CONDITION_STATES = {
  HEALTHY: 'healthy',
  NORMAL: 'normal',
  NEEDS_ATTENTION: 'needs-attention',
  STRESSED: 'stressed',
  CRITICAL: 'critical',
}

const STATE_ORDER = [
  CONDITION_STATES.HEALTHY,
  CONDITION_STATES.NORMAL,
  CONDITION_STATES.NEEDS_ATTENTION,
  CONDITION_STATES.STRESSED,
  CONDITION_STATES.CRITICAL,
]

const STATE_META = {
  [CONDITION_STATES.HEALTHY]: { label: 'Healthy', droop: 0 },
  [CONDITION_STATES.NORMAL]: { label: 'Normal', droop: 1 },
  [CONDITION_STATES.NEEDS_ATTENTION]: { label: 'Needs Attention', droop: 2 },
  [CONDITION_STATES.STRESSED]: { label: 'Stressed', droop: 3 },
  [CONDITION_STATES.CRITICAL]: { label: 'Critical', droop: 4 },
}

function worsenBy(state, steps) {
  const index = STATE_ORDER.indexOf(state)
  const nextIndex = Math.min(index + steps, STATE_ORDER.length - 1)
  return STATE_ORDER[nextIndex]
}

function moistureState(plant, soilMoisture) {
  if (soilMoisture >= plant.idealMoistureMin) {
    return CONDITION_STATES.HEALTHY
  }
  const deficitRatio = (plant.idealMoistureMin - soilMoisture) / plant.idealMoistureMin
  if (deficitRatio <= 0.15) return CONDITION_STATES.NORMAL
  if (deficitRatio <= 0.35) return CONDITION_STATES.NEEDS_ATTENTION
  if (deficitRatio <= 0.55) return CONDITION_STATES.STRESSED
  return CONDITION_STATES.CRITICAL
}

function isOutOfRange(value, range = {}, toleranceRatio = 0.15) {
  const { min, max } = range;
  if (min !== undefined && value < min) return (min - value) / min > toleranceRatio;
  if (max !== undefined && value > max) return (value - max) / max > toleranceRatio;
  return false;
}

/**
 * @param {object} plant - a plant record from src/data/plants.js
 * @param {{ soilMoisture: number, temperature: number, humidity: number }} telemetry
 * @returns {{ state: string, label: string, droop: number }}
 */
export function computePlantCondition(plant, telemetry) {
  if (!plant || !telemetry) {
    return { state: CONDITION_STATES.NORMAL, ...STATE_META[CONDITION_STATES.NORMAL] }
  }

  let state = moistureState(plant, telemetry.soilMoisture)

  const temperatureOff = isOutOfRange(telemetry.temperature, plant.temperaturePreference)
  const humidityOff = isOutOfRange(telemetry.humidity, plant.humidityPreference)

  if (temperatureOff) state = worsenBy(state, 1)
  if (humidityOff) state = worsenBy(state, 1)

  return { state, ...STATE_META[state] }
}
