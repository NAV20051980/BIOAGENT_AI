import PlantIllustration from '../common/PlantIllustration.jsx'
import { computePlantCondition } from '../../utils/plantHealth.js'
import './DigitalTwinPanel.css'

const CAPTIONS = {
  healthy: 'looking vibrant and upright — no action needed right now.',
  normal: 'in good shape, tracking slightly toward the dry side.',
  'needs-attention': 'starting to droop as soil moisture drifts below its ideal range.',
  stressed: 'visibly stressed — soil moisture has fallen well below its ideal range.',
  critical: 'in critical condition and needs water soon.',
}

// LEVEL 9 PART 1: this is now the UPPER REGION of ONE central hero object
// (see CentralPlantSystem), not its own card. It intentionally no longer
// renders its own <Panel> — the surrounding background/border/shadow now
// belong to the hero as a whole, so the twin and Growing Analysis read as
// one object instead of two cards glued together. Same computed
// condition/state as before; the floating temperature and humidity chips
// are unchanged placement, reusing the same `telemetry` values shown in
// Growing Analysis so nothing here can disagree with that panel.
export default function DigitalTwinPanel({ plant, telemetry }) {
  const condition = computePlantCondition(plant, telemetry)

  return (
    <div className="twin-panel">
      <p className="twin-panel__eyebrow">2D Digital Twin</p>
      <div className="twin-panel__stage">
        <span className="twin-panel__side-stat twin-panel__side-stat--temp">
          {telemetry.temperature}&deg;
        </span>
        <span className="twin-panel__side-stat twin-panel__side-stat--humidity">
          {telemetry.humidity}%
        </span>
        <div className={`twin-panel__blob twin-panel__blob--${condition.state}`}>
          <PlantIllustration
            shape={plant.illustration.shape}
            color={plant.illustration.color}
            droop={condition.droop}
            showPot
            size={148}
          />
        </div>
        <span className={`twin-panel__badge twin-panel__badge--${condition.state}`}>
          {condition.label}
        </span>
      </div>
      <p className="twin-panel__caption">
        {plant.name} is {CAPTIONS[condition.state]}
      </p>
    </div>
  )
}
