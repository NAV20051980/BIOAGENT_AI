import CurrentConditionsPanel from '../components/weather/CurrentConditionsPanel.jsx';
import ForecastPanel from '../components/weather/ForecastPanel.jsx';
import PlantRelevancePanel from '../components/weather/PlantRelevancePanel.jsx';
import { currentWeather, forecast } from '../data/weather.js';
import { useBioAgent } from '../context/BioAgentContext.jsx';
import './Weather.css';

export default function Weather() {
  const { weather: liveWeather } = useBioAgent();

  const weatherData = liveWeather?.available
    ? {
        condition: liveWeather.condition || 'Partly Cloudy',
        temperature: liveWeather.temperature || 24,
        rainProbability: liveWeather.rainProbability ?? 20,
        expectedRainfall: liveWeather.expectedRainfall ?? 0.5,
        humidity: 50,
      }
    : currentWeather;

  return (
    <div className="weather-page">
      <header className="weather-page__header">
        <h1>Weather</h1>
        <p>
          Live OpenWeather forecast — integrated into autonomous AI irrigation reasoning.
        </p>
      </header>

      <div className="weather-page__row">
        <CurrentConditionsPanel weather={weatherData} />
        <PlantRelevancePanel weather={weatherData} />
      </div>

      <ForecastPanel forecast={forecast} />
    </div>
  );
}
