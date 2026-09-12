import { CloudSun, CloudRain, Sun, Cloud, CloudLightning, Flame, Droplets, Thermometer } from 'lucide-react'
import Panel from '../common/Panel.jsx'
import './CurrentConditionsPanel.css'

const CONDITION_ICONS = {
  'Partly Cloudy': CloudSun,
  'Sunny': Sun,
  'Sunny / Clear': Sun,
  'Clear / Sunny': Sun,
  'Cloudy': Cloud,
  'Light Rain': CloudRain,
  'Heavy Rain': CloudRain,
  'Thunderstorm': CloudLightning,
  'Heavy Thunderstorm': CloudLightning,
  'Extreme Heat': Flame,
  'Heatwave': Flame,
}

export default function CurrentConditionsPanel({ weather }) {
  const Icon = CONDITION_ICONS[weather.condition] ?? CloudSun

  return (
    <Panel className="current-conditions-panel">
      <p className="current-conditions-panel__eyebrow">Current Conditions</p>

      <div className="current-conditions-panel__body">
        <div className="current-conditions-panel__icon">
          <Icon size={40} strokeWidth={1.5} aria-hidden="true" />
        </div>
        <div>
          <p className="current-conditions-panel__temp">{weather.temperature}{'\u00b0'}C</p>
          <p className="current-conditions-panel__condition">{weather.condition}</p>
        </div>
      </div>

      <div className="current-conditions-panel__stats">
        <div className="current-conditions-panel__stat">
          <Droplets size={16} strokeWidth={1.75} aria-hidden="true" />
          <div>
            <span>Rain Probability</span>
            <strong>{weather.rainProbability}%</strong>
          </div>
        </div>
        <div className="current-conditions-panel__stat">
          <Thermometer size={16} strokeWidth={1.75} aria-hidden="true" />
          <div>
            <span>Expected Rainfall</span>
            <strong>{weather.expectedRainfall} mm</strong>
          </div>
        </div>
      </div>
    </Panel>
  )
}
