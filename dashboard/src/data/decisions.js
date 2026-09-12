// Mock "AI reasoning agent" output. This is intentionally simple, rule-based
// mock logic — it stands in for the real backend agent described in the
// product architecture, not an actual model call. It reuses
// `computePlantCondition` from `plantHealth.js` (the same function the
// Level 4 digital twin uses) so the twin's visual state and the analysis
// panel's decision text can never disagree with each other.

import { CONDITION_STATES, computePlantCondition } from '../utils/plantHealth.js'

const WATER_STATES = new Set([CONDITION_STATES.STRESSED, CONDITION_STATES.CRITICAL])

function rainExpectedSoon(weather) {
  return weather.rainProbability >= 60 && weather.expectedRainfall >= 1
}

/**
 * @param {object} plant - a plant record from src/data/plants.js
 * @param {{soilMoisture:number,temperature:number,humidity:number}} telemetry
 * @param {{rainProbability:number,expectedRainfall:number}} weather
 * @returns {{ decision: 'WATER'|'WAIT', reason: string, condition: object }}
 */
export function computeIrrigationDecision(plant, telemetry, weather) {
  const condition = computePlantCondition(plant, telemetry)
  const needsWater = WATER_STATES.has(condition.state)

  if (needsWater && rainExpectedSoon(weather)) {
    return {
      decision: 'WAIT',
      reason: `Soil moisture is below ${plant.name}'s preferred range, but rain is expected soon, so BioAgent recommends waiting.`,
      condition,
    }
  }

  if (needsWater) {
    return {
      decision: 'WATER',
      reason: `Soil moisture has dropped below ${plant.name}'s preferred range, so irrigation is recommended.`,
      condition,
    }
  }

  if (condition.state === CONDITION_STATES.NEEDS_ATTENTION) {
    return {
      decision: 'WAIT',
      reason: `Soil moisture is trending toward the low end of ${plant.name}'s preferred range. BioAgent will continue monitoring before recommending irrigation.`,
      condition,
    }
  }

  return {
    decision: 'WAIT',
    reason: `Soil moisture is currently within ${plant.name}'s preferred range, so irrigation is not required.`,
    condition,
  }
}
