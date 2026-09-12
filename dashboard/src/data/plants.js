// Plant identity/profile data.
//
// This module intentionally only models plant IDENTITY — name, description,
// growth context, and ideal environmental ranges. It does NOT model live
// telemetry, AI decisions, weather, device state, or history — those are
// separate concerns that later levels will introduce as their own modules
// (e.g. `telemetry.js`, `decisions.js`, `history.js`) and join against a
// plant's `id`. That keeps this file swappable for a future
// `GET /api/plants` response without any UI changes.
//
// `illustration` describes a shape/color pairing consumed by
// `PlantIllustration` (src/components/inventory/PlantIllustration.jsx) so
// every plant renders from the same small SVG "botanical family" instead of
// unrelated art per plant. The same shape+color pairing is designed to be
// reused by the Level 4 digital twin so the selected plant looks consistent
// across the dashboard.

export const plants = [
  {
    id: 'aglaonema',
    name: 'Aglaonema',
    commonName: 'Chinese Evergreen',
    description:
      'A resilient tropical foliage plant with broad, patterned leaves. Tolerates low light and thrives with consistent, moderate watering.',
    growthStage: 'Mature',
    week: 34,
    idealMoistureMin: 40,
    idealMoistureMax: 60,
    temperaturePreference: { min: 18, max: 27 },
    humidityPreference: { min: 45, max: 65 },
    illustration: { shape: 'broadleaf', color: 'olive' },
  },
  {
    id: 'monstera',
    name: 'Monstera',
    commonName: 'Swiss Cheese Plant',
    description:
      'Known for its dramatic split leaves, this fast-growing climber favors bright, indirect light and steady soil moisture.',
    growthStage: 'Growing',
    week: 21,
    idealMoistureMin: 45,
    idealMoistureMax: 65,
    temperaturePreference: { min: 19, max: 29 },
    humidityPreference: { min: 50, max: 70 },
    illustration: { shape: 'splitleaf', color: 'botanical' },
  },
  {
    id: 'snake-plant',
    name: 'Snake Plant',
    commonName: 'Sansevieria',
    description:
      'A hardy, upright succulent with stiff, sword-like leaves. Highly drought-tolerant and forgiving of infrequent watering.',
    growthStage: 'Mature',
    week: 48,
    idealMoistureMin: 20,
    idealMoistureMax: 40,
    temperaturePreference: { min: 16, max: 30 },
    humidityPreference: { min: 30, max: 50 },
    illustration: { shape: 'blade', color: 'sage' },
  },
  {
    id: 'peace-lily',
    name: 'Peace Lily',
    commonName: 'Spathiphyllum',
    description:
      'A shade-loving plant with glossy leaves and elegant white blooms. Prefers consistently moist, never soggy, soil.',
    growthStage: 'Flowering',
    week: 27,
    idealMoistureMin: 50,
    idealMoistureMax: 70,
    temperaturePreference: { min: 18, max: 26 },
    humidityPreference: { min: 50, max: 70 },
    illustration: { shape: 'broadleaf', color: 'botanical' },
  },
  {
    id: 'pothos',
    name: 'Pothos',
    commonName: 'Devil\u2019s Ivy',
    description:
      'A trailing vine with heart-shaped leaves, prized for its adaptability. Handles a wide range of light and watering conditions.',
    growthStage: 'Growing',
    week: 15,
    idealMoistureMin: 35,
    idealMoistureMax: 55,
    temperaturePreference: { min: 18, max: 28 },
    humidityPreference: { min: 40, max: 60 },
    illustration: { shape: 'trailing', color: 'sage' },
  },
  {
    id: 'zz-plant',
    name: 'ZZ Plant',
    commonName: 'Zamioculcas zamiifolia',
    description:
      'A sturdy, glossy-leaved plant that stores water in its rhizomes, making it exceptionally tolerant of dry spells.',
    growthStage: 'Mature',
    week: 40,
    idealMoistureMin: 20,
    idealMoistureMax: 40,
    temperaturePreference: { min: 18, max: 29 },
    humidityPreference: { min: 30, max: 50 },
    illustration: { shape: 'blade', color: 'olive' },
  },
  {
    id: 'spider-plant',
    name: 'Spider Plant',
    commonName: 'Chlorophytum comosum',
    description:
      'An easygoing plant with arching, striped leaves that sends out small plantlets on long runners as it matures.',
    growthStage: 'Growing',
    week: 18,
    idealMoistureMin: 35,
    idealMoistureMax: 55,
    temperaturePreference: { min: 16, max: 27 },
    humidityPreference: { min: 40, max: 60 },
    illustration: { shape: 'trailing', color: 'olive' },
  },
  {
    id: 'philodendron',
    name: 'Philodendron',
    commonName: 'Heartleaf Philodendron',
    description:
      'A climbing or trailing plant with heart-shaped leaves. Grows quickly under warm, humid conditions with even moisture.',
    growthStage: 'Growing',
    week: 23,
    idealMoistureMin: 40,
    idealMoistureMax: 60,
    temperaturePreference: { min: 19, max: 29 },
    humidityPreference: { min: 50, max: 70 },
    illustration: { shape: 'splitleaf', color: 'sage' },
  },
  {
    id: 'rubber-plant',
    name: 'Rubber Plant',
    commonName: 'Ficus elastica',
    description:
      'A statement plant with thick, glossy, deep-green leaves. Prefers to dry out slightly between waterings.',
    growthStage: 'Mature',
    week: 52,
    idealMoistureMin: 30,
    idealMoistureMax: 50,
    temperaturePreference: { min: 18, max: 27 },
    humidityPreference: { min: 40, max: 60 },
    illustration: { shape: 'broadleaf', color: 'botanical' },
  },
  {
    id: 'calathea',
    name: 'Calathea',
    commonName: 'Prayer Plant',
    description:
      'Grown for its striking patterned foliage that folds upward at night. Sensitive to dry soil and inconsistent humidity.',
    growthStage: 'Seedling',
    week: 6,
    idealMoistureMin: 55,
    idealMoistureMax: 75,
    temperaturePreference: { min: 19, max: 27 },
    humidityPreference: { min: 55, max: 75 },
    illustration: { shape: 'splitleaf', color: 'olive' },
  },
  {
    id: 'areca-palm',
    name: 'Areca Palm',
    commonName: 'Dypsis lutescens',
    description:
      'A feathery, clustering palm that brings an airy, tropical presence. Prefers steady moisture and bright, filtered light.',
    growthStage: 'Growing',
    week: 30,
    idealMoistureMin: 45,
    idealMoistureMax: 65,
    temperaturePreference: { min: 18, max: 28 },
    humidityPreference: { min: 45, max: 65 },
    illustration: { shape: 'blade', color: 'botanical' },
  },
  {
    id: 'aloe-vera',
    name: 'Aloe Vera',
    commonName: 'Aloe barbadensis',
    description:
      'A sun-loving succulent with thick, fleshy leaves. Stores water efficiently and prefers to be left mostly dry.',
    growthStage: 'Mature',
    week: 45,
    idealMoistureMin: 15,
    idealMoistureMax: 35,
    temperaturePreference: { min: 18, max: 30 },
    humidityPreference: { min: 25, max: 45 },
    illustration: { shape: 'blade', color: 'sage' },
  },
]

export const DEFAULT_PLANT_ID = 'aglaonema'

export function getPlantById(id) {
  return plants.find((plant) => plant.id === id) ?? plants[0]
}
