import React from 'react';
import { CloudRain, Sun, CloudLightning, Cloud, Flame, RotateCcw, Sparkles, Activity } from 'lucide-react';
import { useBioAgent } from '../context/BioAgentContext.jsx';
import './DemoWeatherControls.css';

const CONDITIONS = [
  'Clear / Sunny',
  'Light Rain',
  'Heavy Thunderstorm',
  'Cloudy',
  'Heatwave',
];

export default function DemoWeatherControls() {
  const {
    isDemoMode,
    demoWeather,
    updateDemoWeather,
    applyWeatherPreset,
    weather,
    latestDecision,
    loading,
  } = useBioAgent();

  // 1. Render controls only when isDemoMode is active
  if (!isDemoMode) {
    return null;
  }

  const currentCondition = demoWeather.active ? demoWeather.condition : (weather.condition || 'Clear / Sunny');
  const currentRainProb = demoWeather.active ? demoWeather.rainProbability : (weather.rainProbability ?? 5);
  const currentTemp = demoWeather.active ? demoWeather.temperature : (weather.temperature ?? 24);
  const currentRainMm = demoWeather.active ? demoWeather.expectedRainfall : (weather.expectedRainfall ?? 0);

  const isRainSuspensionActive = currentRainProb >= 60 || currentRainMm >= 3.0;

  const handleConditionChange = (e) => {
    const newCond = e.target.value;
    let autoRainProb = currentRainProb;
    let autoRainMm = currentRainMm;
    let autoTemp = currentTemp;

    if (newCond === 'Heavy Thunderstorm') {
      autoRainProb = Math.max(85, currentRainProb);
      autoRainMm = Math.max(15, currentRainMm);
      autoTemp = Math.min(22, currentTemp);
    } else if (newCond === 'Light Rain') {
      autoRainProb = Math.max(65, currentRainProb);
      autoRainMm = Math.max(5, currentRainMm);
    } else if (newCond === 'Heatwave') {
      autoRainProb = 0;
      autoRainMm = 0;
      autoTemp = Math.max(38, currentTemp);
    } else if (newCond === 'Clear / Sunny') {
      autoRainProb = Math.min(15, currentRainProb);
      autoRainMm = 0;
    }

    updateDemoWeather({
      condition: newCond,
      rainProbability: autoRainProb,
      expectedRainfall: autoRainMm,
      temperature: autoTemp,
    });
  };

  const handleRainProbChange = (e) => {
    const val = Number(e.target.value);
    let autoCond = currentCondition;
    if (val >= 85) autoCond = 'Heavy Thunderstorm';
    else if (val >= 50) autoCond = 'Light Rain';
    else if (val <= 10 && currentCondition !== 'Heatwave') autoCond = 'Clear / Sunny';

    updateDemoWeather({
      rainProbability: val,
      condition: autoCond,
    });
  };

  const handleTempChange = (e) => {
    const val = Number(e.target.value);
    let autoCond = currentCondition;
    if (val >= 38) autoCond = 'Heatwave';
    updateDemoWeather({
      temperature: val,
      condition: autoCond,
    });
  };

  const handleRainMmChange = (e) => {
    const val = Number(e.target.value);
    updateDemoWeather({
      expectedRainfall: val,
    });
  };

  return (
    <div className="demo-weather-card">
      {/* Header */}
      <div className="demo-weather-card__header">
        <div className="demo-weather-card__title-group">
          <span className="demo-badge">
            <Sparkles size={13} className="sparkle-icon" />
            DEMO SIMULATOR
          </span>
          <h3 className="demo-weather-card__title">Manual Weather & Evapotranspiration Controls</h3>
        </div>

        <div className="demo-weather-card__actions">
          {demoWeather.active && (
            <span className="demo-weather-card__active-pill">
              <span className="demo-weather-card__live-dot" />
              Simulation Active
            </span>
          )}
          <button
            type="button"
            className="demo-weather-card__reset-btn"
            onClick={() => applyWeatherPreset('reset')}
            title="Reset to live real-world weather"
          >
            <RotateCcw size={13} />
            <span>Live Weather</span>
          </button>
        </div>
      </div>

      {/* Quick Preset Toggle Button Bar */}
      <div className="demo-weather-presets">
        <span className="demo-weather-presets__label">Quick Presets:</span>
        <div className="demo-weather-presets__btn-row">
          <button
            type="button"
            className={`preset-btn ${currentCondition === 'Clear / Sunny' ? 'preset-btn--active' : ''}`}
            onClick={() => applyWeatherPreset('sunny')}
          >
            <Sun size={14} className="preset-icon preset-icon--sun" />
            <span>☀️ Sunny Day</span>
          </button>

          <button
            type="button"
            className={`preset-btn ${currentCondition === 'Light Rain' ? 'preset-btn--active' : ''}`}
            onClick={() => applyWeatherPreset('rain')}
          >
            <CloudRain size={14} className="preset-icon preset-icon--rain" />
            <span>🌧️ Rain Forecasted</span>
          </button>

          <button
            type="button"
            className={`preset-btn ${currentCondition === 'Heavy Thunderstorm' ? 'preset-btn--active' : ''}`}
            onClick={() => applyWeatherPreset('storm')}
          >
            <CloudLightning size={14} className="preset-icon preset-icon--storm" />
            <span>🌩️ Severe Storm</span>
          </button>

          <button
            type="button"
            className={`preset-btn ${currentCondition === 'Heatwave' ? 'preset-btn--active' : ''}`}
            onClick={() => applyWeatherPreset('heatwave')}
          >
            <Flame size={14} className="preset-icon preset-icon--heat" />
            <span>🔥 Heatwave</span>
          </button>
        </div>
      </div>

      {/* Interactive Controls Grid */}
      <div className="demo-weather-grid">
        {/* 1. Condition Select */}
        <div className="demo-control-group">
          <label className="demo-control-label" htmlFor="weather-condition-select">
            Condition Scenario
          </label>
          <div className="demo-select-wrapper">
            <select
              id="weather-condition-select"
              className="demo-select"
              value={currentCondition}
              onChange={handleConditionChange}
            >
              {CONDITIONS.map((cond) => (
                <option key={cond} value={cond}>
                  {cond}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 2. Rain Probability Slider (0% - 100%) */}
        <div className="demo-control-group">
          <div className="demo-control-header">
            <label className="demo-control-label" htmlFor="rain-prob-slider">
              Rain Probability
            </label>
            <span className={`demo-control-val ${currentRainProb >= 60 ? 'demo-control-val--warning' : ''}`}>
              {currentRainProb}%
            </span>
          </div>
          <input
            id="rain-prob-slider"
            type="range"
            min="0"
            max="100"
            step="1"
            value={currentRainProb}
            onChange={handleRainProbChange}
            className="demo-slider demo-slider--rain"
          />
          <div className="demo-slider-ticks">
            <span>0%</span>
            <span className="tick-threshold">60% Threshold</span>
            <span>100%</span>
          </div>
        </div>

        {/* 3. Temperature Offset Slider (15°C - 45°C) */}
        <div className="demo-control-group">
          <div className="demo-control-header">
            <label className="demo-control-label" htmlFor="temp-slider">
              Temperature
            </label>
            <span className="demo-control-val">{currentTemp}°C</span>
          </div>
          <input
            id="temp-slider"
            type="range"
            min="15"
            max="45"
            step="1"
            value={currentTemp}
            onChange={handleTempChange}
            className="demo-slider demo-slider--temp"
          />
          <div className="demo-slider-ticks">
            <span>15°C</span>
            <span>30°C</span>
            <span>45°C</span>
          </div>
        </div>

        {/* 4. Expected Rainfall (0mm - 50mm) */}
        <div className="demo-control-group">
          <div className="demo-control-header">
            <label className="demo-control-label" htmlFor="rainfall-slider">
              Expected Rainfall
            </label>
            <span className="demo-control-val">{currentRainMm} mm</span>
          </div>
          <input
            id="rainfall-slider"
            type="range"
            min="0"
            max="50"
            step="0.5"
            value={currentRainMm}
            onChange={handleRainMmChange}
            className="demo-slider demo-slider--rainfall"
          />
          <div className="demo-slider-ticks">
            <span>0 mm</span>
            <span>25 mm</span>
            <span>50 mm</span>
          </div>
        </div>
      </div>

      {/* Dynamic AI Decision Live Status Callout */}
      <div className={`demo-weather-ai-status ${isRainSuspensionActive ? 'demo-weather-ai-status--suspended' : 'demo-weather-ai-status--normal'}`}>
        <div className="demo-weather-ai-status__icon">
          <Activity size={16} />
        </div>
        <div className="demo-weather-ai-status__content">
          <div className="demo-weather-ai-status__title">
            <strong>Groq AI Reasoning Feedback:</strong>{' '}
            {isRainSuspensionActive ? (
              <span className="status-suspended-text">⚠️ Watering Suspended (Rain Predicted)</span>
            ) : (
              <span className="status-active-text">✅ Standard Irrigation Logic Active</span>
            )}
          </div>
          <p className="demo-weather-ai-status__reason">
            {latestDecision?.reason || 'Awaiting closed-loop decision evaluation...'}
          </p>
        </div>
      </div>
    </div>
  );
}
