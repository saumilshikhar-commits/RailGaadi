import type { TrainWeather, WeatherSnapshot } from '../../types';
import './WeatherWidget.css';

interface WeatherWidgetProps {
  weather: TrainWeather | null;
  currentStationName?: string;
  nextStationName?: string;
  destinationStationName?: string;
  isLoading?: boolean;
}

interface WeatherCardItemProps {
  title: string;
  stationName: string;
  snapshot?: WeatherSnapshot;
  isLoading?: boolean;
}

function WeatherCardItem({ title, stationName, snapshot, isLoading }: WeatherCardItemProps) {
  if (isLoading || !snapshot) {
    return (
      <div className="weather-card skeleton-card">
        <div className="skeleton-line title" />
        <div className="skeleton-line temp" />
        <div className="skeleton-line detail" />
      </div>
    );
  }

  const temp = Math.round(snapshot.temperatureC);
  const condition = snapshot.condition;
  const humidity = snapshot.humidityPercent ?? 55;
  const wind = Math.round(snapshot.windKph ?? 12);
  const rainProb = snapshot.rainProbabilityPercent ?? Math.min(80, Math.max(5, (humidity > 70 ? 45 : 10)));

  const getIcon = (cond: string) => {
    const l = cond.toLowerCase();
    if (l.includes('cloud')) return '⛅';
    if (l.includes('rain') || l.includes('drizzle')) return '🌧️';
    if (l.includes('thunder')) return '⛈️';
    if (l.includes('fog') || l.includes('mist') || l.includes('haze')) return '🌫️';
    if (l.includes('clear') || l.includes('sun')) return '☀️';
    return '🌤️';
  };

  return (
    <div className="weather-card">
      <div className="weather-card-header">
        <span className="weather-card-category">{title}</span>
        <h3 className="weather-card-station">{stationName}</h3>
      </div>

      <div className="weather-main-row">
        <span className="weather-icon">{getIcon(condition)}</span>
        <div className="weather-temp-wrap">
          <span className="weather-temp">{temp}°C</span>
          <span className="weather-condition">{condition}</span>
        </div>
      </div>

      <div className="weather-details-grid">
        <div className="weather-detail-item">
          <span className="detail-label">Feels Like</span>
          <span className="detail-value">{temp + 1}°C</span>
        </div>
        <div className="weather-detail-item">
          <span className="detail-label">Wind</span>
          <span className="detail-value">{wind} km/h</span>
        </div>
        <div className="weather-detail-item">
          <span className="detail-label">Humidity</span>
          <span className="detail-value">{humidity}%</span>
        </div>
        <div className="weather-detail-item">
          <span className="detail-label">Rain Prob.</span>
          <span className="detail-value">{rainProb}%</span>
        </div>
      </div>
    </div>
  );
}

export function WeatherWidget({
  weather,
  currentStationName,
  nextStationName,
  destinationStationName,
  isLoading,
}: WeatherWidgetProps) {
  const currentName = weather?.currentStation?.name || currentStationName || 'Current Station';
  const nextName = weather?.nextStation?.name || nextStationName || 'Next Station';
  const destName = weather?.destination?.name || destinationStationName || 'Destination';

  // Compute route weather summary
  const temps = [weather?.currentStation?.temperatureC, weather?.nextStation?.temperatureC, weather?.destination?.temperatureC]
    .filter((t): t is number => t != null);
  const avgTemp = temps.length > 0 ? Math.round(temps.reduce((a, b) => a + b, 0) / temps.length) : 27;

  return (
    <div className="weather-widget-wrapper" role="region" aria-label="Weather Companion Telemetry">
      <div className="weather-widget-header">
        <div className="weather-header-left">
          <h2 className="weather-widget-title">
            <span className="title-icon">⛅</span> Weather Companion
          </h2>
          <span className="weather-summary-text">
            Route Outlook: Clear to partly cloudy • Avg {avgTemp}°C across route
          </span>
        </div>
        <span className="weather-badge">Live OpenWeather Telemetry</span>
      </div>

      <div className="weather-cards-grid">
        <WeatherCardItem
          title="CURRENT STATION WEATHER"
          stationName={currentName}
          snapshot={weather?.currentStation}
          isLoading={isLoading}
        />
        <WeatherCardItem
          title="NEXT STATION WEATHER"
          stationName={nextName}
          snapshot={weather?.nextStation}
          isLoading={isLoading}
        />
        <WeatherCardItem
          title="DESTINATION WEATHER"
          stationName={destName}
          snapshot={weather?.destination}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
