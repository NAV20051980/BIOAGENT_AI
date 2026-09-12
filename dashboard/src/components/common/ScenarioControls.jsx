import { useState } from 'react'
import { Send, RefreshCw, CloudRain, Sun, Droplets } from 'lucide-react'
import { useBioAgent } from '../../context/BioAgentContext.jsx'
import './ScenarioControls.css'

export default function ScenarioControls() {
  const { handleSendTelemetry, handleDemoWeatherScenario, loading, errors } = useBioAgent()
  const [customMoisture, setCustomMoisture] = useState(30)
  const [customTemp, setCustomTemp] = useState(25)
  const [customHum, setCustomHum] = useState(50)
  const [activeScenario, setActiveScenario] = useState(null)

  async function triggerScenario(name, payload) {
    setActiveScenario(name)
    try {
      await handleSendTelemetry(payload)
    } finally {
      setActiveScenario(null)
    }
  }

  async function triggerRainScenario() {
    setActiveScenario('rain')
    try {
      await handleDemoWeatherScenario('rain')
      await handleSendTelemetry({
        soil_moisture_pct: 32,
        temperature_c: 23,
        humidity_pct: 65,
        device_id: 'demo-rain-scenario',
      })
    } finally {
      setActiveScenario(null)
    }
  }

  async function triggerClearScenario() {
    setActiveScenario('clear')
    try {
      await handleDemoWeatherScenario('clear')
      await handleSendTelemetry({
        soil_moisture_pct: 32,
        temperature_c: 29,
        humidity_pct: 40,
        device_id: 'demo-clear-scenario',
      })
    } finally {
      setActiveScenario(null)
    }
  }

  async function resetWeather() {
    setActiveScenario('reset')
    try {
      await handleDemoWeatherScenario('off')
    } finally {
      setActiveScenario(null)
    }
  }

  async function handleSendCustom() {
    setActiveScenario('custom')
    try {
      await handleSendTelemetry({
        soil_moisture_pct: Number(customMoisture),
        temperature_c: Number(customTemp),
        humidity_pct: Number(customHum),
        device_id: 'manual-control',
      })
    } finally {
      setActiveScenario(null)
    }
  }

  return (
    <div className="scenario-bar">
      <div className="scenario-bar__header">
        <span className="scenario-bar__title">Live Telemetry & Demo Controls (POST /telemetry)</span>
        {loading.telemetry && (
          <span className="scenario-bar__loading">
            <RefreshCw size={12} className="spin" /> Groq AI Reasoning...
          </span>
        )}
      </div>

      {errors.telemetry && (
        <div className="scenario-bar__error">
          <span>⚠️ {errors.telemetry}</span>
        </div>
      )}

      <div className="scenario-bar__buttons">
        <button
          type="button"
          className={`scenario-bar__btn ${activeScenario === 'dry' ? 'scenario-bar__btn--active' : ''}`}
          onClick={() =>
            triggerScenario('dry', {
              soil_moisture_pct: 20,
              temperature_c: 30,
              humidity_pct: 50,
              device_id: 'demo-dry',
            })
          }
          disabled={loading.telemetry}
        >
          🌵 Dry (20%)
        </button>

        <button
          type="button"
          className={`scenario-bar__btn ${activeScenario === 'balanced' ? 'scenario-bar__btn--active' : ''}`}
          onClick={() =>
            triggerScenario('balanced', {
              soil_moisture_pct: 48,
              temperature_c: 24,
              humidity_pct: 55,
              device_id: 'demo-balanced',
            })
          }
          disabled={loading.telemetry}
        >
          🌿 Balanced (48%)
        </button>

        <button
          type="button"
          className={`scenario-bar__btn ${activeScenario === 'wet' ? 'scenario-bar__btn--active' : ''}`}
          onClick={() =>
            triggerScenario('wet', {
              soil_moisture_pct: 70,
              temperature_c: 22,
              humidity_pct: 65,
              device_id: 'demo-wet',
            })
          }
          disabled={loading.telemetry}
        >
          💧 Wet (70%)
        </button>

        <button
          type="button"
          className={`scenario-bar__btn ${activeScenario === 'rain' ? 'scenario-bar__btn--active' : ''}`}
          onClick={triggerRainScenario}
          disabled={loading.telemetry}
        >
          <CloudRain size={13} /> Rain Scenario
        </button>

        <button
          type="button"
          className={`scenario-bar__btn ${activeScenario === 'clear' ? 'scenario-bar__btn--active' : ''}`}
          onClick={triggerClearScenario}
          disabled={loading.telemetry}
        >
          <Sun size={13} /> Clear Scenario
        </button>

        <button
          type="button"
          className="scenario-bar__btn scenario-bar__btn--secondary"
          onClick={resetWeather}
          disabled={loading.telemetry}
          title="Reset weather to real OpenWeather forecast"
        >
          <RefreshCw size={12} /> Reset Weather
        </button>
      </div>

      <div className="scenario-bar__custom">
        <div className="scenario-bar__input-group">
          <label>Moisture:</label>
          <input
            type="number"
            min="0"
            max="100"
            value={customMoisture}
            onChange={(e) => setCustomMoisture(e.target.value)}
          />
          <span>%</span>
        </div>

        <div className="scenario-bar__input-group">
          <label>Temp:</label>
          <input
            type="number"
            min="0"
            max="50"
            value={customTemp}
            onChange={(e) => setCustomTemp(e.target.value)}
          />
          <span>°C</span>
        </div>

        <div className="scenario-bar__input-group">
          <label>Humidity:</label>
          <input
            type="number"
            min="0"
            max="100"
            value={customHum}
            onChange={(e) => setCustomHum(e.target.value)}
          />
          <span>%</span>
        </div>

        <button
          type="button"
          className="scenario-bar__btn scenario-bar__btn--send"
          onClick={handleSendCustom}
          disabled={loading.telemetry}
        >
          <Send size={12} /> Send Telemetry
        </button>
      </div>
    </div>
  )
}
