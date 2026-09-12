// Mock "computer vision" leaf-analysis output for the BioLens prototype.
//
// BioLens is a FUTURE image-based feature (per product spec: "for now,
// polished prototype, mock analysis, no real AI, no API"). Rather than
// invent a second, disconnected notion of plant health, this reuses the
// exact same `computePlantCondition` that the digital twin and growing
// analysis already use, and translates that one condition into the kind of
// descriptive readout a leaf-scan feature would plausibly report (visual
// leaf color / turgidity / pest signs) — so BioLens can never show a
// "thriving" read for a plant the rest of the dashboard says is Critical.
//
// This is explicitly a visual/UI mock, not a model call: no image is
// actually processed.

import { CONDITION_STATES, computePlantCondition } from '../utils/plantHealth.js'

const READOUTS = {
  [CONDITION_STATES.HEALTHY]: {
    leafColor: 'Deep, even green',
    turgidity: 'Firm, upright leaves',
    pestSigns: 'No visible pest activity',
    summary: 'Leaf structure and color are consistent with a well-hydrated, healthy plant.',
  },
  [CONDITION_STATES.NORMAL]: {
    leafColor: 'Even green, slightly muted',
    turgidity: 'Mostly firm, minor softness at leaf edges',
    pestSigns: 'No visible pest activity',
    summary: 'Leaves look generally healthy with only minor signs of drying at the margins.',
  },
  [CONDITION_STATES.NEEDS_ATTENTION]: {
    leafColor: 'Slight yellowing at leaf tips',
    turgidity: 'Mild drooping in lower leaves',
    pestSigns: 'No visible pest activity',
    summary: 'Early visual signs of under-watering — worth a closer look over the next day.',
  },
  [CONDITION_STATES.STRESSED]: {
    leafColor: 'Noticeable yellowing and dulling',
    turgidity: 'Visible drooping across most leaves',
    pestSigns: 'No visible pest activity, but reduced vigor',
    summary: 'Visual signs of moisture stress are clear — leaf posture and color both affected.',
  },
  [CONDITION_STATES.CRITICAL]: {
    leafColor: 'Significant yellowing/browning at edges',
    turgidity: 'Severe wilting, leaves curling inward',
    pestSigns: 'No visible pest activity, but plant is under acute stress',
    summary: 'Strong visual indicators of critical water stress — matches the current sensor reading.',
  },
}

/**
 * @param {object} plant - a plant record from src/data/plants.js
 * @param {{soilMoisture:number,temperature:number,humidity:number}} telemetry
 * @returns {{ state:string, label:string, confidence:number, leafColor:string, turgidity:string, pestSigns:string, summary:string }}
 */
export function computeBioLensReading(plant, telemetry) {
  const condition = computePlantCondition(plant, telemetry)
  const readout = READOUTS[condition.state]

  return {
    state: condition.state,
    label: condition.label,
    // Confidence is cosmetic prototype flavor, not a real model score —
    // deterministic per state (not random) so re-scanning the same plant
    // gives a stable, reproducible demo result.
    confidence: 90 - condition.droop * 3,
    ...readout,
  }
}
