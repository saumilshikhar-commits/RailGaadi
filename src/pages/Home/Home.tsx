import { useNavigate } from 'react-router-dom';
import { TrainSearch } from '../../components/search/TrainSearch';
import type { Train } from '../../types';
import { useRecentSearches, useFavouriteTrains } from '../../hooks/useStorage';
import './Home.css';

import { useTrainSearch } from '../../hooks/useTrainQueries';
import './Home.css';

const FEATURES = [
  {
    icon: '🗺️',
    title: 'Interactive Vector Maps',
    desc: 'High-resolution route rendering with CartoDB dark tiles & MapLibre GL, including live station dots and route geometry.',
    accent: '#38bdf8',
  },
  {
    icon: '📡',
    title: 'Live RailRadar Telemetry',
    desc: 'Real-time train GPS position, platform numbers, delay status, ETA, and progress metrics via RailRadar API.',
    accent: '#a78bfa',
  },
  {
    icon: '⛰️',
    title: 'Terrain & Elevation',
    desc: 'OpenTopography altitude profile along the complete train route with highest-point analysis and gradients.',
    accent: '#34d399',
  },
  {
    icon: '⛅',
    title: 'Station Weather Companion',
    desc: 'Live OpenWeather snapshots for current, next, and destination stations — temperature, wind, and conditions.',
    accent: '#fb923c',
  },
];

export function Home() {
  const navigate = useNavigate();
  const { recentSearches, removeRecentSearch, clearRecentSearches } = useRecentSearches();
  const { favourites, removeFavourite } = useFavouriteTrains();

  // Dynamic popular express trains directly from RailRadar lookup API
  const { data: popularTrains } = useTrainSearch('Rajdhani');

  const handleSelectTrain = (train: Train) => {
    navigate(`/live/${train.id}`);
  };

  const handleQuickSearch = (trainId: string) => {
    navigate(`/live/${trainId}`);
  };

  return (
    <main className="home-page" id="main-content">

      {/* ── HERO ─────────────────────────────────────────────────────────────── */}
      <section className="hero" aria-labelledby="hero-title">
        {/* Ambient background glows */}
        <div className="hero-glow hero-glow-1" aria-hidden="true" />
        <div className="hero-glow hero-glow-2" aria-hidden="true" />
        <div className="hero-grid-overlay" aria-hidden="true" />

        <div className="hero-inner">
          <div className="hero-eyebrow" aria-label="Platform tagline">
            <span className="hero-eyebrow-pill">
              <span className="hero-eyebrow-dot" />
              LIVE · REAL-TIME INDIAN RAILWAY TELEMETRY
            </span>
          </div>

          <h1 id="hero-title" className="hero-title">
            Track Any Train.<br />
            <span className="hero-title-accent">Anywhere in India.</span>
          </h1>

          <p className="hero-subtitle">
            Live GPS position, route maps, weather, elevation, and station ETAs —
            powered by RailRadar, OpenWeather & MapLibre. Search any of India's 13,000+ trains.
          </p>

          {/* Search */}
          <div className="hero-search-wrapper" role="search">
            <TrainSearch autoFocus onSelect={handleSelectTrain} />
            <p className="hero-search-hint">
              Try searching: <button className="hero-hint-chip" onClick={() => handleQuickSearch('12626')}>12626 Kerala Express</button>
              <button className="hero-hint-chip" onClick={() => handleQuickSearch('12801')}>12801 Purushottam</button>
              <button className="hero-hint-chip" onClick={() => handleQuickSearch('12951')}>12951 Tejas Rajdhani</button>
            </p>
          </div>

          {/* Suggested Trains */}
          {popularTrains && popularTrains.length > 0 && (
            <div className="suggested-trains-section">
              <div className="suggested-header">
                <span className="suggested-label">Popular Express Trains</span>
              </div>
              <div className="suggested-grid" role="list">
                {popularTrains.slice(0, 8).map(train => (
                  <button
                    key={train.id}
                    className="suggested-card"
                    onClick={() => handleQuickSearch(train.id)}
                    role="listitem"
                    aria-label={`Track ${train.number} ${train.name}`}
                  >
                    <span className="suggested-icon">🚆</span>
                    <div className="suggested-info">
                      <span className="suggested-number">{train.number}</span>
                      <span className="suggested-name">{train.name}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── FAVOURITES & RECENT ───────────────────────────────────────────────── */}
      {(favourites.length > 0 || recentSearches.length > 0) && (
        <section className="home-lists" aria-label="Recent searches and favourite trains">
          <div className="home-lists-inner">
            {/* Favourites */}
            {favourites.length > 0 && (
              <div className="list-section">
                <div className="list-section-header">
                  <h2 className="list-section-title">
                    <span className="section-title-icon">⭐</span>
                    Favourite Trains
                  </h2>
                </div>
                <div className="train-pill-list">
                  {favourites.map(fav => (
                    <div key={fav.trainId} className="train-pill">
                      <button
                        className="train-pill-btn"
                        onClick={() => navigate(`/live/${fav.trainId}`)}
                      >
                        <span className="train-pill-number">{fav.trainNumber}</span>
                        <span className="train-pill-name">{fav.trainName}</span>
                      </button>
                      <button
                        className="train-pill-remove"
                        onClick={() => removeFavourite(fav.trainId)}
                        aria-label="Remove favourite"
                      >✕</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Searches */}
            {recentSearches.length > 0 && (
              <div className="list-section">
                <div className="list-section-header">
                  <h2 className="list-section-title">
                    <span className="section-title-icon">🕒</span>
                    Recent Searches
                  </h2>
                  <button className="list-clear-btn" onClick={clearRecentSearches}>
                    Clear history
                  </button>
                </div>
                <div className="train-pill-list">
                  {recentSearches.map(r => (
                    <div key={r.trainId} className="train-pill">
                      <button
                        className="train-pill-btn"
                        onClick={() => navigate(`/live/${r.trainId}`)}
                      >
                        <span className="train-pill-number">{r.trainNumber}</span>
                        <span className="train-pill-name">{r.trainName}</span>
                      </button>
                      <button
                        className="train-pill-remove"
                        onClick={() => removeRecentSearch(r.trainId)}
                        aria-label="Remove recent"
                      >✕</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── FEATURES GRID ────────────────────────────────────────────────────── */}
      <section className="features-grid-section" aria-label="Platform features">
        <div className="features-section-header">
          <h2 className="features-section-title">Everything You Need to Track a Train</h2>
          <p className="features-section-subtitle">One unified dashboard. Four live data sources. Zero guesswork.</p>
        </div>
        <div className="features-inner">
          {FEATURES.map(f => (
            <div
              key={f.title}
              className="feature-card"
              style={{ '--card-accent': f.accent } as React.CSSProperties}
            >
              <div className="feature-icon-wrap">
                <span className="feature-icon">{f.icon}</span>
              </div>
              <h3 className="feature-title">{f.title}</h3>
              <p className="feature-desc">{f.desc}</p>
              <div className="feature-card-glow" aria-hidden="true" />
            </div>
          ))}
        </div>
      </section>

      {/* ── FOOTER STRIP ─────────────────────────────────────────────────────── */}
      <footer className="home-footer" aria-label="Powered by">
        <div className="home-footer-inner">
          <span className="footer-powered">Powered by</span>
          {['RailRadar', 'OpenWeather', 'OpenTopography', 'MapLibre GL', 'Overpass OSM'].map(s => (
            <span key={s} className="footer-badge">{s}</span>
          ))}
        </div>
      </footer>
    </main>
  );
}
