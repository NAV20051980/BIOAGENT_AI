import { Droplets, Leaf } from 'lucide-react'
import Panel from '../common/Panel.jsx'
import PlantIllustration from '../common/PlantIllustration.jsx'
import { useBioAgent } from '../../context/BioAgentContext.jsx'

import { computeIrrigationDecision } from '../../data/decisions.js'
import './PlantRelevancePanel.css'

// Ties the shared weather reading to each plant's live irrigation decision
// (the same `computeIrrigationDecision` the Dashboard uses), so the Weather
// page can answer "what does today's weather actually mean for my plants?"
// without introducing a second, disconnected notion of what needs water.
export default function PlantRelevancePanel({ weather }) {
  const { userPlants, latestTelemetry } = useBioAgent()
  const rows = (userPlants || []).map((plant) => {
    const decision = computeIrrigationDecision(plant, latestTelemetry, weather)
    return { plant, decision }
  })

  const waterCount = rows.filter((row) => row.decision.decision === 'WATER').length

  return (
    <Panel className="plant-relevance-panel">
      <div className="plant-relevance-panel__head">
        <p className="plant-relevance-panel__eyebrow">Plant Relevance</p>
        <p className="plant-relevance-panel__summary">
          {waterCount === 0
            ? 'No plants need watering today given current conditions.'
            : `${waterCount} of ${rows.length} plants may need watering today.`}
        </p>
      </div>

{rows.length === 0 ? (
          <p className="plant-relevance-panel__empty">No plants yet. Use BioLens to add one.</p>
        ) : (
          <ul className="plant-relevance-panel__list">
            {rows.map(({ plant, decision }) => (
              <li className="plant-relevance-panel__row" key={plant.id}>
                <PlantIllustration shape={plant.illustration?.shape || 'broadleaf'} color={plant.illustration?.color || 'botanical'} size={22} />
                <span className="plant-relevance-panel__name">{plant.name || plant.commonName || plant.scientific_name}</span>
                <span
                  className={`plant-relevance-panel__decision plant-relevance-panel__decision--${decision.decision.toLowerCase()}`}
                >
                  {decision.decision === 'WATER' ? (
                    <Droplets size={12} strokeWidth={2.25} aria-hidden="true" />
                  ) : (
                    <Leaf size={12} strokeWidth={2.25} aria-hidden="true" />
                  )}
                  {decision.decision}
                </span>
              </li>
            ))}
          </ul>
        )}
    </Panel>
  )
}
