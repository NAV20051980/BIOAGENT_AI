import PlantIllustration from '../common/PlantIllustration.jsx';
import Panel from '../common/Panel.jsx';
import { computePlantCondition } from '../../utils/plantHealth.js';
import { Sprout, Droplets, Thermometer, Wind, CheckCircle2 } from 'lucide-react';
import './CentralPlantSystem.css';
import { getToken } from '../../api.js';

export default function CentralPlantSystem({ plant, telemetry, weather, decision }) {
  // If plant data is not yet available, render a lightweight placeholder to avoid crashes.
  if (!plant) {
    return (
      <Panel className="central-plant-card">
        <p className="central-plant-card__loading">Loading plant data…</p>
      </Panel>
    );
  }

  const safePlant = plant || {
    name: 'Bael',
    scientificName: 'Aegle marmelos',
    commonName: 'Bengal Quince',
    description: 'Sacred medicinal tree with exceptional drought resistance and vital botanical compounds.',
    growthStage: 'Mature',
    week: 34,
    idealMoistureMin: 40,
    idealMoistureMax: 60,
    temperaturePreference: { min: 20, max: 35 },
    humidityPreference: { min: 40, max: 70 },
    illustration: { shape: 'broadleaf', color: 'botanical' },
  };

  const safeTelemetry = telemetry || { soilMoisture: 45, temperature: 24, humidity: 50 };
  const condition = computePlantCondition(safePlant, safeTelemetry);

  return (
    <Panel className="central-plant-card">
      <div className="central-plant-card__header">
        <div className="central-plant-card__badge">
          <Sprout size={13} color="var(--color-botanical, #35462e)" />
          <span>Active Specimen</span>
        </div>
        <span className="central-plant-card__status">
          <CheckCircle2 size={12} color="#2e7d32" />
          <span>Profile Active</span>
        </span>
      </div>

      <div className="central-plant-card__identity">
        <div className="central-plant-card__illustration-wrap">
          <PlantIllustration
            shape={safePlant.illustration?.shape || 'broadleaf'}
            color={safePlant.illustration?.color || 'botanical'}
            droop={condition?.droop || 0}
            showPot
            size={52}
          />
        </div>
        <div className="central-plant-card__titles">
          <h2 className="central-plant-card__name">{safePlant.name || 'Bael'}</h2>
          <p className="central-plant-card__scientific">
            {safePlant.scientificName || safePlant.commonName || 'Aegle marmelos'}
          </p>
          <span className="central-plant-card__stage">
            {safePlant.growthStage || 'Mature'} · Week {safePlant.week || 34}
          </span>
        </div>
      </div>

      <p className="central-plant-card__desc">
        {safePlant.description || 'Optimized for Groq AI autonomous closed-loop irrigation.'}
      </p>

      <div className="central-plant-card__specs">
        <div className="central-plant-spec">
          <Droplets size={13} color="#94550e" />
          <span className="central-plant-spec__label">Ideal Moisture</span>
          <strong className="central-plant-spec__val">
            {safePlant.idealMoistureMin}–{safePlant.idealMoistureMax}%
          </strong>
        </div>
        <div className="central-plant-spec">
          <Thermometer size={13} color="#d46b08" />
          <span className="central-plant-spec__label">Opt. Temp</span>
          <strong className="central-plant-spec__val">
            {safePlant.temperaturePreference?.min || 18}–{safePlant.temperaturePreference?.max || 30}°C
          </strong>
        </div>
        <div className="central-plant-spec">
          <Wind size={13} color="#2e7d32" />
          <span className="central-plant-spec__label">Opt. Humidity</span>
          <strong className="central-plant-spec__val">
            {safePlant.humidityPreference?.min || 40}–{safePlant.humidityPreference?.max || 70}%
          </strong>
        </div>
      </div>
    </Panel>
  );
}
