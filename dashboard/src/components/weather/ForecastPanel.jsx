import { CloudSun, CloudRain, Sun, Cloud } from 'lucide-react'
import Panel from '../common/Panel.jsx'
import './ForecastPanel.css'

const CONDITION_ICONS = {
  'Partly Cloudy': CloudSun,
  Sunny: Sun,
  Cloudy: Cloud,
  'Light Rain': CloudRain,
}

export default function ForecastPanel({ forecast }) {
  return (
    <Panel className="forecast-panel">
      <p className="forecast-panel__eyebrow">5-Day Forecast</p>
      <div className="forecast-panel__row">
        {forecast.map((day) => {
          const Icon = CONDITION_ICONS[day.condition] ?? CloudSun
          return (
            <div className="forecast-panel__day" key={day.day}>
              <span className="forecast-panel__day-label">{day.day}</span>
              <Icon size={22} strokeWidth={1.5} aria-hidden="true" />
              <span className="forecast-panel__day-temps">
                {day.high}{'\u00b0'} <span>{day.low}{'\u00b0'}</span>
              </span>
              <span className="forecast-panel__day-rain">{day.rainProbability}%</span>
            </div>
          )
        })}
      </div>
    </Panel>
  )
}
