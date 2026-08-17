import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useJourney, useLiveStatus, useWeather, useElevation, useContextFeatures } from '../../hooks/useTrainQueries';
import { isFavourite, toggleFavourite } from '../../services/localStorage';
import { JourneyMap } from '../../components/map/JourneyMap';
import { StatusCard } from '../../components/journey/StatusCard';
import { ShareModal } from '../../components/journey/ShareModal';
import { ElevationProfile } from '../../components/journey/ElevationProfile';
import { WeatherWidget } from '../../components/journey/WeatherWidget';
import { GeoContextWidget } from '../../components/journey/GeoContextWidget';
import { StationTimeline } from '../../components/journey/StationTimeline';
import { ErrorBoundary } from '../../components/ui/ErrorBoundary';
import type { GeoFeatureCategory, StationStop, LiveStatus } from '../../types';
import './Journey.css';

// Inline skeleton cards for loading state
function StatusCardSkeleton() {
  return (
    <div className="status-skeleton-card" aria-busy="true" aria-label="Loading train status">
      <div className="sk-line" style={{ width: '35%', height: '14px' }} />
      <div className="sk-line" style={{ width: '65%', height: '22px' }} />
      <div className="sk-line" style={{ width: '100%', height: '70px' }} />
    </div>
  );
}

function TimelineSkeleton() {
  return (
    <div className="timeline-skeleton-wrap" aria-busy="true" aria-label="Loading station timeline">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="sk-timeline-item">
          <div className="sk-node" />
          <div className="sk-content">
            <div className="sk-line" style={{ width: `${55 + i * 5}%`, height: '11px' }} />
            <div className="sk-line" style={{ width: '30%', height: '9px' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function Journey() {
  const { trainId } = useParams<{ trainId: string }>();
  const [showShare, setShowShare] = useState(false);
  const [fav, setFav] = useState(() => isFavourite(trainId ?? ''));
  const [activeTab, setActiveTab] = useState<'map' | 'weather' | 'terrain'>('map');
  const [activeCategories, setActiveCategories] = useState<GeoFeatureCategory[]>([
    'river', 'mountain', 'bridge', 'monument', 'city',
  ]);

  useEffect(() => {
    setFav(isFavourite(trainId ?? ''));
  }, [trainId]);

  const { data: journey, isError: journeyError, isLoading: journeyLoading, refetch: refetchJourney } = useJourney(trainId ?? null);
  const { data: liveStatus, refetch: refetchLive } = useLiveStatus(trainId ?? null);
  const { data: weather, isLoading: weatherLoading } = useWeather(trainId ?? null);
  const { data: elevation } = useElevation(trainId ?? null);
  const { data: geoFeatures, isLoading: geoLoading } = useContextFeatures(trainId ?? null, activeCategories);

  const formattedTrainName = journey?.trainName ?? liveStatus?.trainName ?? `Train ${trainId}`;

  const handleFavourite = () => {
    if (!journey && !liveStatus) return;
    const origin = journey?.origin.name ?? liveStatus?.originName ?? 'Origin';
    const destination = journey?.destination.name ?? liveStatus?.destinationName ?? 'Destination';
    const nowFav = toggleFavourite({
      trainId: trainId!,
      trainNumber: trainId!,
      trainName: `${origin} – ${destination}`,
      origin,
      destination,
    });
    setFav(nowFav);
  };

  const handleToggleCategory = (cat: GeoFeatureCategory) => {
    setActiveCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const handleRefresh = () => {
    refetchLive();
    refetchJourney();
  };

  // Only show error page if journey schedule could not be loaded and loading is finished
  if (journeyError && !journeyLoading && !journey) {
    return (
      <div className="journey-error" role="alert">
        <div className="journey-error-inner">
          <span className="journey-error-icon">🚫</span>
          <h1>Train not found or live data unavailable.</h1>
          <p>We couldn't load live journey data for train <strong>{trainId}</strong>.</p>
          <p className="journey-error-sub">Please verify the train number or try searching for another train.</p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '20px' }}>
            <button className="status-refresh-btn journey-retry-btn" onClick={handleRefresh}>
              🔄 Retry
            </button>
            <Link to="/" className="journey-error-back">← Back to search</Link>
          </div>
        </div>
      </div>
    );
  }

  // Map live station statuses and calculate current position
  const stationStatusMap = liveStatus?.stationStatuses ?? {};
  const currentStationCode = liveStatus?.currentStation?.code;
  const nextStationCode = liveStatus?.nextStation?.code;
  const coveredKm = liveStatus?.distanceCoveredKm ?? 0;
  const isCompleted = liveStatus?.status === 'completed';
  const isNotStarted = liveStatus?.status === 'not_started';

  // Find index of current station in journey schedule
  let currentStationIndex = -1;

  if (journey?.stations && journey.stations.length > 0) {
    if (isCompleted) {
      currentStationIndex = journey.stations.length - 1;
    } else if (isNotStarted) {
      currentStationIndex = 0;
    } else {
      // 1. Try matching currentStationCode in halt stations list
      if (currentStationCode) {
        currentStationIndex = journey.stations.findIndex(s => (s.station.code ?? s.station.id) === currentStationCode);
      }
      // 2. If currentStationCode is a non-halt passing station, find by nextStationCode
      if (currentStationIndex === -1 && nextStationCode) {
        const nextIdx = journey.stations.findIndex(s => (s.station.code ?? s.station.id) === nextStationCode);
        if (nextIdx > 0) {
          currentStationIndex = nextIdx - 1;
        } else if (nextIdx === 0) {
          currentStationIndex = 0;
        }
      }
      // 3. Fallback using distance covered or passed statuses from stationStatusMap
      if (currentStationIndex === -1) {
        let lastDepartedIdx = -1;
        for (let i = 0; i < journey.stations.length; i++) {
          const code = journey.stations[i].station.code ?? journey.stations[i].station.id;
          const status = stationStatusMap[code]?.status;
          const dist = journey.stations[i].distanceFromOriginKm ?? journey.stations[i].distanceKm ?? 0;

          if (status === 'departed' || (dist <= coveredKm && coveredKm > 0)) {
            lastDepartedIdx = i;
          }
        }
        currentStationIndex = lastDepartedIdx >= 0 ? Math.min(lastDepartedIdx + 1, journey.stations.length - 1) : 0;
      }
    }
  }

  // Construct stops array for timeline with accurate live status
  const stops: StationStop[] = journey?.stations.map((s, idx) => {
    const code = s.station.code ?? s.station.id;
    const liveInfo = stationStatusMap[code];

    let isPassed = false;
    let isCurrent = false;

    if (isCompleted) {
      isPassed = true;
    } else if (isNotStarted) {
      isCurrent = idx === 0;
      isPassed = false;
    } else {
      if (currentStationIndex >= 0) {
        if (idx < currentStationIndex) {
          isPassed = true;
        } else if (idx === currentStationIndex) {
          isCurrent = true;
        } else {
          isPassed = false;
        }
      }

      // Explicit API status override
      if (liveInfo?.status === 'departed') {
        isPassed = true;
        isCurrent = false;
      } else if (liveInfo?.status === 'at_station') {
        isCurrent = true;
        isPassed = false;
      }
    }

    return {
      name: s.station.name,
      code,
      scheduledArrival: s.scheduledArrival,
      scheduledDeparture: s.scheduledDeparture,
      actualArrival: liveInfo?.actualArrival ?? s.actualArrival,
      actualDeparture: liveInfo?.actualDeparture ?? s.actualDeparture,
      delayMinutes: liveInfo?.delayMinutes ?? s.delayMinutes ?? liveStatus?.delayMinutes ?? 0,
      distanceKm: s.distanceFromOriginKm ?? s.distanceKm ?? 0,
      platform: liveInfo?.platform ?? s.station.platform ?? s.platform,
      isPassed,
      isCurrent,
    };
  }) ?? [];

  const isInitialLoading = journeyLoading && !journey;

  const fallbackLiveStatus: LiveStatus = liveStatus ?? {
    trainId: trainId ?? '',
    trainName: formattedTrainName,
    originName: journey?.origin.name ?? '',
    destinationName: journey?.destination.name ?? '',
    destinationEta: 'Scheduled',
    delayMinutes: 0,
    currentSpeedKmh: 0,
    distanceCoveredKm: 0,
    distanceRemainingKm: journey?.totalDistanceKm ?? 0,
    totalDistanceKm: journey?.totalDistanceKm ?? 0,
    progressPercent: 0,
    sourceUpdatedAt: new Date().toISOString(),
    receivedAt: new Date().toISOString(),
    freshness: 'unknown',
    status: 'not_started',
    isLiveGpsAvailable: false,
    trackingMode: 'scheduled',
    statusMessage: 'Scheduled route',
  };

  return (
    <div className="journey-page">
      {/* Top Header Controls Bar */}
      <div className="journey-top-controls">
        <Link to="/" className="back-to-search-btn" aria-label="Back to search">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <path d="m15 18-6-6 6-6"/>
          </svg>
          Back to Search
        </Link>

        <div className="top-right-actions">
          <button
            className={`action-pill-btn ${fav ? 'active' : ''}`}
            onClick={handleFavourite}
            aria-label={fav ? 'Remove from favourites' : 'Save to favourites'}
            aria-pressed={fav}
          >
            <span aria-hidden="true">{fav ? '⭐' : '☆'}</span>
            <span>{fav ? 'Saved' : 'Save'}</span>
          </button>

          <button
            className="action-pill-btn"
            onClick={() => setShowShare(true)}
            aria-label="Share journey details"
          >
            <span aria-hidden="true">🔗</span>
            <span>Share</span>
          </button>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="journey-grid">
        {/* Left Main Column: Map + Analytics & Companion Widgets */}
        <main className="journey-main-col">
          {/* 1. Status Header Card */}
          <ErrorBoundary fallback={<div className="error-fallback-box">Failed to load status telemetry.</div>}>
            {isInitialLoading ? (
              <StatusCardSkeleton />
            ) : (
              <StatusCard
                trainNumber={trainId ?? ''}
                trainName={formattedTrainName}
                liveStatus={fallbackLiveStatus}
                originName={journey?.origin.name}
                destinationName={journey?.destination.name}
                onRefresh={handleRefresh}
              />
            )}
          </ErrorBoundary>

          {/* 2. View Mode Tab Navigation Bar */}
          <nav className="journey-tab-nav" role="tablist" aria-label="Journey views">
            <button
              className={`journey-tab-btn ${activeTab === 'map' ? 'active' : ''}`}
              onClick={() => setActiveTab('map')}
              role="tab"
              aria-selected={activeTab === 'map'}
            >
              <span aria-hidden="true">🗺️</span>
              <span>Live Map</span>
            </button>

            <button
              className={`journey-tab-btn ${activeTab === 'weather' ? 'active' : ''}`}
              onClick={() => setActiveTab('weather')}
              role="tab"
              aria-selected={activeTab === 'weather'}
            >
              <span aria-hidden="true">🌤️</span>
              <span>Weather</span>
            </button>

            <button
              className={`journey-tab-btn ${activeTab === 'terrain' ? 'active' : ''}`}
              onClick={() => setActiveTab('terrain')}
              role="tab"
              aria-selected={activeTab === 'terrain'}
            >
              <span aria-hidden="true">🏔️</span>
              <span>Terrain & Analytics</span>
            </button>
          </nav>

          {/* 3. Conditional Tab Content */}
          {activeTab === 'map' && (
            <>
              {/* Vector Map Card */}
              <section className="journey-section-card map-card-section" aria-label="Interactive Vector Map">
                <div className="section-header">
                  <h2 className="section-title">
                    <span aria-hidden="true">🗺️</span> Interactive Vector Route Map
                  </h2>
                  <span className="section-badge">Live Telemetry & GPS</span>
                </div>
                <div className="map-container-box">
                  <ErrorBoundary fallback={<div className="error-fallback-box">Map failed to render.</div>}>
                    <JourneyMap
                      journey={journey ?? null}
                      liveStatus={liveStatus ?? null}
                      geoFeatures={geoFeatures}
                    />
                  </ErrorBoundary>
                </div>
              </section>

              {/* Geographic Context Landmarks */}
              <section className="journey-section-card" aria-label="Geographic Context Landmarks">
                <ErrorBoundary fallback={<div className="error-fallback-box">Failed to load geographic landmarks.</div>}>
                  <GeoContextWidget
                    features={geoFeatures ?? []}
                    activeCategories={activeCategories}
                    onToggleCategory={handleToggleCategory}
                    isLoading={geoLoading}
                  />
                </ErrorBoundary>
              </section>
            </>
          )}

          {activeTab === 'weather' && (
            <section className="journey-section-card" aria-label="Weather Companion">
              <ErrorBoundary fallback={<div className="error-fallback-box">Weather data unavailable.</div>}>
                <WeatherWidget weather={weather ?? null} isLoading={weatherLoading} />
              </ErrorBoundary>
            </section>
          )}

          {activeTab === 'terrain' && (
            <section className="journey-section-card" aria-label="Terrain Elevation Profile">
              <ErrorBoundary fallback={<div className="error-fallback-box">Elevation profile unavailable.</div>}>
                <ElevationProfile
                  elevation={elevation ?? null}
                  currentDistanceKm={fallbackLiveStatus.distanceCoveredKm}
                  delayMinutes={fallbackLiveStatus.delayMinutes}
                  totalDistanceKm={fallbackLiveStatus.totalDistanceKm}
                  stops={stops}
                />
              </ErrorBoundary>
            </section>
          )}
        </main>

        {/* Right Column: Station Timeline */}
        <aside className="journey-sidebar-col" aria-label="Station Timeline Sidebar">
          <ErrorBoundary fallback={<div className="error-fallback-box">Timeline unavailable.</div>}>
            {isInitialLoading ? (
              <TimelineSkeleton />
            ) : (
              <StationTimeline
                stops={stops}
                currentStationCode={liveStatus?.currentStation?.code}
              />
            )}
          </ErrorBoundary>
        </aside>
      </div>

      {/* Share Modal */}
      {showShare && (
        <ShareModal
          trainId={trainId ?? ''}
          trainName={formattedTrainName}
          onClose={() => setShowShare(false)}
        />
      )}
    </div>
  );
}
