import { Link } from 'react-router-dom'
import { Droplets, Eye, Leaf, Thermometer, Wind, Camera } from 'lucide-react'
import PlantIllustration from '../common/PlantIllustration.jsx'
import { computePlantCondition } from '../../utils/plantHealth.js'
import { HISTORY_EVENT_TYPES } from '../../data/history.js'
import './PlantHistoryPanel.css'

const EVENT_ICONS = {
  [HISTORY_EVENT_TYPES.WATERED]: Droplets,
  [HISTORY_EVENT_TYPES.NO_WATERING]: Leaf,
  [HISTORY_EVENT_TYPES.MONITORING]: Eye,
}

export default function PlantHistoryPanel({ plant, telemetry, decision, history }) {
  const condition = computePlantCondition(plant, telemetry)

  return (
    <div className="history-panel">
      <div className="history-panel__context">
        <div className="history-panel__context-illustration">
          <PlantIllustration
            shape={plant.illustration.shape}
            color={plant.illustration.color}
            droop={condition.droop}
            showPot
            size={40}
          />
        </div>
        <div className="history-panel__context-identity">
          <h2 className="history-panel__plant-name">{plant.name}</h2>
          <p className="history-panel__plant-common">{plant.commonName}</p>
        </div>
      </div>

      <div className="history-panel__context-stats">
        <span className="history-panel__context-stat">
          <Droplets size={14} strokeWidth={2} aria-hidden="true" />
          {telemetry.soilMoisture}%
        </span>
        <span className="history-panel__context-stat">
          <Thermometer size={14} strokeWidth={2} aria-hidden="true" />
          {telemetry.temperature}
          {'\u00b0'}C
        </span>
        <span className="history-panel__context-stat">
          <Wind size={14} strokeWidth={2} aria-hidden="true" />
          {telemetry.humidity}%
        </span>
      </div>

      <div className="history-panel__header">
        <p className="history-panel__eyebrow">Plant History</p>
        <p className="history-panel__current">
          Now: <strong>{telemetry.soilMoisture}%</strong> moisture ·{' '}
          <strong>{telemetry.temperature}{'\u00b0'}C</strong> ·{' '}
          <strong>{telemetry.humidity}%</strong> humidity ·{' '}
          <span
            className={`history-panel__current-decision history-panel__current-decision--${decision.decision.toLowerCase()}`}
          >
            {decision.decision}
          </span>
        </p>
      </div>

      <div className="history-panel__scrollable"><ul className="history-panel__timeline">
        {history.map((entry) => {
          const Icon = EVENT_ICONS[entry.type]
          return (
            <li
              className={`history-panel__entry history-panel__entry--${entry.type}`}
              key={entry.id}
            >
              <span className="history-panel__dot" aria-hidden="true">
                <Icon size={12} strokeWidth={2.25} />
              </span>
              <div className="history-panel__entry-body">
                <div className="history-panel__entry-head">
                  <span className="history-panel__entry-time">{entry.label}</span>
                  <span className="history-panel__entry-title">
                    {entry.eventLabel}
                    {entry.type === HISTORY_EVENT_TYPES.WATERED ? ` · ${entry.durationSec} sec` : ''}
                  </span>
                </div>
                <p className="history-panel__entry-reason">{entry.reason}</p>
                <div className="history-panel__entry-meta">
                  <span>{entry.soilMoisture}% moisture</span>
                  <span>{entry.temperature}{'\u00b0'}C</span>
                  <span>{entry.humidity}% humidity</span>
                  <span>{entry.rainProbability}% rain</span>
                </div>
              </div>
            </li>
          )
        })}
      </ul></div>

      {history.length === 0 ? (
        <p className="history-panel__empty">No recorded history yet for {plant.name}.</p>
      ) : null}

      <Link to="/biolens" className="history-panel__scan-link">
        Open BioLens
        <Camera size={14} strokeWidth={2} aria-hidden="true" />
      </Link>
    </div>
  )
}