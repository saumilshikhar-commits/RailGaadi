import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { TrainSearch } from '../search/TrainSearch';
import type { Train } from '../../types';
import './Header.css';

export function Header() {
  const navigate = useNavigate();
  const [showSearchModal, setShowSearchModal] = useState(false);

  // Global Cmd+K shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearchModal(prev => !prev);
      } else if (e.key === 'Escape') {
        setShowSearchModal(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSelectTrain = (train: Train) => {
    setShowSearchModal(false);
    navigate(`/live/${train.id}`);
  };

  return (
    <>
      <header className="site-header" role="banner">
        <div className="header-inner">
          <Link to="/" className="brand-logo" aria-label="RailGaadi Home">
            <div className="logo-icon-wrap">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="3" width="16" height="16" rx="3"/>
                <path d="M4 11h16"/>
                <path d="M12 3v8"/>
                <path d="M8 19l-2 3"/>
                <path d="M16 19l2 3"/>
                <circle cx="8" cy="15" r="1" fill="currentColor"/>
                <circle cx="16" cy="15" r="1" fill="currentColor"/>
              </svg>
            </div>
            <span className="brand-name">RailGaadi</span>
            <span className="live-pill-badge" title="Live telemetry active">
              <span className="live-dot" />
              LIVE
            </span>
          </Link>

          <div className="header-actions">
            <button
              className="header-search-trigger"
              onClick={() => setShowSearchModal(true)}
              aria-label="Open search dialog (⌘K)"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
              <span>Search</span>
              <kbd className="cmd-kbd">⌘K</kbd>
            </button>

            <Link to="/live/12951" className="header-live-btn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <circle cx="12" cy="12" r="10"/>
                <polygon points="10 8 16 12 10 16 10 8" fill="currentColor"/>
              </svg>
              Live Tracking
            </Link>
          </div>
        </div>
      </header>

      {/* Cmd+K Search Modal */}
      {showSearchModal && (
        <div
          className="search-modal-backdrop"
          onClick={e => { if (e.target === e.currentTarget) setShowSearchModal(false); }}
        >
          <div className="search-modal-card">
            <div className="search-modal-header">
              <span className="search-modal-title">Search Train</span>
              <button className="search-modal-close" onClick={() => setShowSearchModal(false)}>✕</button>
            </div>
            <TrainSearch autoFocus onSelect={handleSelectTrain} />
          </div>
        </div>
      )}
    </>
  );
}
