import { useMemo } from 'react';
import { Sparkles, Sun, CloudRain, Zap, RotateCcw, Sliders, Activity } from 'lucide-react';
import CurrentConditionsPanel from '../components/weather/CurrentConditionsPanel.jsx';
import ForecastPanel from '../components/weather/ForecastPanel.jsx';
import PlantRelevancePanel from '../components/weather/PlantRelevancePanel.jsx';
import { currentWeather, forecast } from '../data/weather.js';
import { useBioAgent } from '../context/BioAgentContext.jsx';
import './Weather.css';

const WEATHER_CONDITIONS = [
  'Sunny / Clear',
  'Partly Cloudy',
  'Heavy Rain',
  'Thunderstorm',
  'Extreme Heat',
];

export default function Weather() {
  const {
    isDemoMode,
    toggleDemoMode,
    demoWeather,
    updateDemoWeather,
    applyWeatherPreset,
    weather: liveWeather,
    latestDecision,
  } = useBioAgent();

  const isSimActive = demoWeather?.active;

  // Active weather data feeding cards
  const weatherData = useMemo(() => {
    if (isSimActive) {
      return {
        condition: demoWeather.condition,
        temperature: Number(demoWeather.temperature),
        rainProbability: Number(demoWeather.rainProbability),
        expectedRainfall: Number(demoWeather.expectedRainfall),
        humidity: 50,
      };
    }
    if (liveWeather?.available) {
      return {
        condition: liveWeather.condition || 'Partly Cloudy',
        temperature: liveWeather.temperature || 24,
        rainProbability: liveWeather.rainProbability ?? 20,
        expectedRainfall: liveWeather.expectedRainfall ?? 0.5,
        humidity: 50,
      };
    }
    return currentWeather;
  }, [isSimActive, demoWeather, liveWeather]);

  // Dynamically update 5-day forecast card values for "Today"
  const dynamicForecast = useMemo(() => {
    return forecast.map((dayItem) => {
      if (dayItem.day === 'Today') {
        return {
          ...dayItem,
          condition: weatherData.condition,
          high: Math.round(weatherData.temperature),
          low: Math.max(8, Math.round(weatherData.temperature - 7)),
          rainProbability: Math.round(weatherData.rainProbability),
        };
      }
      return dayItem;
    });
  }, [weatherData]);

  // Preset Handlers
  const handlePresetDryHot = () => {
    updateDemoWeather({
      condition: 'Sunny / Clear',
      temperature: 38,
      rainProbability: 0,
      expectedRainfall: 0.0,
    });
  };

  const handlePresetHeavyRain = () => {
    updateDemoWeather({
      condition: 'Heavy Rain',
      temperature: 21,
      rainProbability: 85,
      expectedRainfall: 16.0,
    });
  };

  const handlePresetStorm = () => {
    updateDemoWeather({
      condition: 'Thunderstorm',
      temperature: 18,
      rainProbability: 95,
      expectedRainfall: 28.0,
    });
  };

  const handleConditionSelect = (e) => {
    const val = e.target.value;
    let rainProb = weatherData.rainProbability;
    let rainMm = weatherData.expectedRainfall;
    let temp = weatherData.temperature;

    if (val === 'Heavy Rain') {
      rainProb = Math.max(80, rainProb);
      rainMm = Math.max(12, rainMm);
    } else if (val === 'Thunderstorm') {
      rainProb = Math.max(90, rainProb);
      rainMm = Math.max(20, rainMm);
      temp = Math.min(22, temp);
    } else if (val === 'Extreme Heat') {
      rainProb = 0;
      rainMm = 0;
      temp = Math.max(39, temp);
    } else if (val === 'Sunny / Clear') {
      rainProb = Math.min(10, rainProb);
      rainMm = 0;
    }

    updateDemoWeather({
      condition: val,
      rainProbability: rainProb,
      expectedRainfall: rainMm,
      temperature: temp,
    });
  };

  const isRainSuspensionActive = (weatherData.rainProbability ?? 0) >= 60 || (weatherData.expectedRainfall ?? 0) >= 3.0;

  return (
    <div className="weather-page">
      <header className="weather-page__header">
        <div className="weather-page__header-title-row">
          <div>
            <h1>Weather Intelligence</h1>
            <p>
              Live OpenWeather integration & AI atmospheric reasoning for precision irrigation.
            </p>
          </div>
          <button
            type="button"
            className={`weather-page__sim-toggle ${isDemoMode ? 'weather-page__sim-toggle--active' : ''}`}
            onClick={() => toggleDemoMode()}
            title="Toggle Demo Weather Simulator"
          >
            <Sliders size={14} />
            <span>{isDemoMode ? 'Demo Simulator Active' : 'Enable Demo Simulator'}</span>
          </button>
        </div>
      </header>

      {/* 1. DEMO CONTROLS PANEL (rendered when demo mode is active) */}
      {isDemoMode && (
        <div className="weather-demo-panel">
          <div className="weather-demo-panel__header">
            <div className="weather-demo-panel__badge-group">
              <span className="weather-demo-badge">
                <Sparkles size={13} />
                DEMO WEATHER SIMULATOR
              </span>
              <span className="weather-demo-panel__desc">
                Adjust sliders or click presets to test AI rain-withholding logic in real time.
              </span>
            </div>

            <div className="weather-demo-panel__actions">
              {isSimActive && (
                <span className="weather-demo-pill">
                  <span className="weather-demo-dot" />
                  Override Active
                </span>
              )}
              <button
                type="button"
                className="weather-demo-reset-btn"
                onClick={() => applyWeatherPreset('reset')}
                title="Reset to live OpenWeather feed"
              >
                <RotateCcw size={13} />
                <span>Reset to Live</span>
              </button>
            </div>
          </div>

          {/* Quick Presets Button Bar */}
          <div className="weather-demo-presets">
            <span className="weather-demo-presets__label">Quick Presets:</span>
            <div className="weather-demo-presets__buttons">
              <button
                type="button"
                className={`weather-preset-btn ${weatherData.condition === 'Sunny / Clear' && weatherData.temperature >= 35 ? 'weather-preset-btn--active' : ''}`}
                onClick={handlePresetDryHot}
              >
                <Sun size={14} className="icon-dry" />
                <span>☀️ Dry & Hot</span>
              </button>

              <button
                type="button"
                className={`weather-preset-btn ${weatherData.condition === 'Heavy Rain' ? 'weather-preset-btn--active' : ''}`}
                onClick={handlePresetHeavyRain}
              >
                <CloudRain size={14} className="icon-rain" />
                <span>🌧️ Impending Heavy Rain</span>
              </button>

              <button
                type="button"
                className={`weather-preset-btn ${weatherData.condition === 'Thunderstorm' ? 'weather-preset-btn--active' : ''}`}
                onClick={handlePresetStorm}
              >
                <Zap size={14} className="icon-storm" />
                <span>⚡ Storm Warning</span>
              </button>
            </div>
          </div>

          {/* Sliders & Dropdown Grid */}
          <div className="weather-demo-grid">
            {/* Condition Dropdown */}
            <div className="weather-demo-input-card">
              <label className="weather-demo-label" htmlFor="weather-condition-dropdown">
                Condition Dropdown
              </label>
              <select
                id="weather-condition-dropdown"
                className="weather-demo-select"
                value={weatherData.condition}
                onChange={handleConditionSelect}
              >
                {WEATHER_CONDITIONS.map((cond) => (
                  <option key={cond} value={cond}>
                    {cond}
                  </option>
                ))}
              </select>
            </div>

            {/* Temperature Slider [10°C to 45°C] */}
            <div className="weather-demo-input-card">
              <div className="weather-demo-card-head">
                <label className="weather-demo-label" htmlFor="weather-temp-slider">
                  Temperature (°C)
                </label>
                <span className="weather-demo-val">{weatherData.temperature}°C</span>
              </div>
              <input
                id="weather-temp-slider"
                type="range"
                min="10"
                max="45"
                step="1"
                value={weatherData.temperature}
                onChange={(e) => updateDemoWeather({ temperature: Number(e.target.value) })}
                className="weather-slider weather-slider--temp"
              />
              <div className="weather-slider-ticks">
                <span>10°C</span>
                <span>28°C</span>
                <span>45°C</span>
              </div>
            </div>

            {/* Rain Probability Slider [0% to 100%] */}
            <div className="weather-demo-input-card">
              <div className="weather-demo-card-head">
                <label className="weather-demo-label" htmlFor="weather-rain-slider">
                  Rain Probability (%)
                </label>
                <span className={`weather-demo-val ${weatherData.rainProbability >= 60 ? 'weather-demo-val--alert' : ''}`}>
                  {weatherData.rainProbability}%
                </span>
              </div>
              <input
                id="weather-rain-slider"
                type="range"
                min="0"
                max="100"
                step="1"
                value={weatherData.rainProbability}
                onChange={(e) => updateDemoWeather({ rainProbability: Number(e.target.value) })}
                className="weather-slider weather-slider--rain"
              />
              <div className="weather-slider-ticks">
                <span>0%</span>
                <span className="tick-rain-threshold">≥60% Suspend</span>
                <span>100%</span>
              </div>
            </div>

            {/* Expected Rainfall Slider + Number Input [0.0mm to 50.0mm] */}
            <div className="weather-demo-input-card">
              <div className="weather-demo-card-head">
                <label className="weather-demo-label" htmlFor="weather-rainfall-input">
                  Expected Rainfall (mm)
                </label>
                <div className="weather-demo-number-wrap">
                  <input
                    id="weather-rainfall-input"
                    type="number"
                    min="0"
                    max="50"
                    step="0.1"
                    value={weatherData.expectedRainfall}
                    onChange={(e) => updateDemoWeather({ expectedRainfall: Number(e.target.value) })}
                    className="weather-number-input"
                  />
                  <span className="weather-unit">mm</span>
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                step="0.5"
                value={weatherData.expectedRainfall}
                onChange={(e) => updateDemoWeather({ expectedRainfall: Number(e.target.value) })}
                className="weather-slider weather-slider--rainfall"
                aria-label="Expected Rainfall Slider"
              />
            </div>
          </div>

          {/* AI Decision Influence Callout */}
          <div className={`weather-demo-feedback ${isRainSuspensionActive ? 'weather-demo-feedback--suspended' : 'weather-demo-feedback--normal'}`}>
            <Activity size={16} className="weather-demo-feedback__icon" />
            <div className="weather-demo-feedback__text">
              <strong>Closed-Loop AI Decision State:</strong>{' '}
              {isRainSuspensionActive ? (
                <span className="feedback-highlight feedback-highlight--alert">
                  Watering Suspended: Rain Predicted ({weatherData.rainProbability}% chance, {weatherData.expectedRainfall}mm rainfall)
                </span>
              ) : (
                <span className="feedback-highlight feedback-highlight--ok">
                  Active Reasoning: {latestDecision?.reason || 'Standard irrigation rules active'}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. CURRENT CONDITIONS & PLANT RELEVANCE */}
      <div className="weather-page__row">
        <CurrentConditionsPanel weather={weatherData} />
        <PlantRelevancePanel weather={weatherData} />
      </div>

      {/* 3. 5-DAY FORECAST (with reactive 'Today' binding) */}
      <ForecastPanel forecast={dynamicForecast} />
    </div>
  );
}
