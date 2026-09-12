import DigitalTwin3D from '../DigitalTwin3D.jsx'
import { computePlantCondition } from '../../utils/plantHealth.js'
import './DigitalTwinPanel.css'

const CAPTIONS = {
  healthy: 'looking vibrant and upright — optimal turgor pressure maintained.',
  normal: 'in good shape, tracking steady with healthy cellular turgidity.',
  'needs-attention': 'starting to droop as soil moisture drifts below its ideal range.',
  stressed: 'visibly stressed with loss of leaf turgor — soil moisture is low.',
  critical: 'in critical condition — severe turgor loss, requires hydration soon.',
}

export default function DigitalTwinPanel({ plant, telemetry }) {
  const condition = computePlantCondition(plant, telemetry)
  const moisture =
    telemetry?.soil_moisture_pct ??
    telemetry?.soil_moisture ??
    telemetry?.soilMoisture ??
    45
  const humidity =
    telemetry?.humidity_pct ??
    telemetry?.humidity ??
    50
  const temperature =
    telemetry?.temperature_c ??
    telemetry?.temperature ??
    24

  return (
    <div className="twin-panel">
      <div className="twin-panel__header">
        <p className="twin-panel__eyebrow">3D Digital Twin</p>
        <span className="twin-panel__live-indicator">
          <span className="twin-panel__pulse-dot" />
          Interactive 3D
        </span>
      </div>

      <div className="twin-panel__stage">
        {/* Floating Telemetry Metric Badges */}
        <span className="twin-panel__side-stat twin-panel__side-stat--temp">
          {temperature}&deg;C
        </span>
        <span className="twin-panel__side-stat twin-panel__side-stat--humidity">
          {humidity}%
        </span>

        {/* 3D Scene Component */}
        <div className="twin-panel__3d-container">
          <DigitalTwin3D
            moisture={moisture}
            humidity={humidity}
            temperature={temperature}
            plant={plant}
            telemetry={telemetry}
          />
        </div>

        {/* Plant Condition Badge */}
        <span className={`twin-panel__badge twin-panel__badge--${condition.state}`}>
          {condition.label}
        </span>
      </div>

      <p className="twin-panel__caption">
        <strong>{plant?.name || 'Plant'}</strong> is {CAPTIONS[condition.state] || 'monitored in real-time.'}
      </p>
    </div>
  )
}
