import { useState, useEffect } from 'react';
import type { LiveStatus } from '../../types';
import { formatDelay } from '../../hooks/utils';
import './StatusCard.css';

interface StatusCardProps {
  trainNumber: string;
  trainName: string;
  liveStatus: LiveStatus;
  originName?: string;
  destinationName?: string;
  onRefresh?: () => void;
}

export function StatusCard({
  trainNumber,
  trainName,
  liveStatus,
  originName,
  destinationName,
  onRefresh,
}: StatusCardProps) {
  const [secondsAgo, setSecondsAgo] = useState(0);

  useEffect(() => {
    setSecondsAgo(0);
    const interval = setInterval(() => {
      setSecondsAgo(s => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [liveStatus]);

  const { label: delayText, isLate } = formatDelay(liveStatus.delayMinutes);

  const coveredKm = Math.round(liveStatus.distanceCoveredKm ?? 0);
  const totalKm = Math.round(liveStatus.totalDistanceKm ?? 0);
  const remainingKm = Math.max(0, totalKm - coveredKm);
  const percent = Math.round(liveStatus.progressPercent ?? (totalKm > 0 ? Math.min(100, (coveredKm / totalKm) * 100) : 0));

  const currentStationName = liveStatus.currentStation?.name ?? 'En Route';
  const platform = liveStatus.currentStation?.platform ? `Platform ${liveStatus.currentStation.platform}` : 'PF N/A';
  const speedKmh = liveStatus.currentSpeedKmh ?? 0;
  const etaText = liveStatus.destinationEta ?? liveStatus.etaDestination ?? 'Scheduled';

  const routeOrigin = liveStatus.originName || originName || 'Origin';
  const routeDest = liveStatus.destinationName || destinationName || 'Destination';

  const isLiveGps = liveStatus.isLiveGpsAvailable ?? true;
  const statusMsg = liveStatus.statusMessage ?? (isLiveGps ? 'Live Tracking Active' : 'Live location unavailable');

  // SVG Circular progress ring calculations
  const strokeWidth = 5;
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  return (
    <div className="main-status-card" role="region" aria-label="Live Train Telemetry Status">
      {/* Header Bar inside card */}
      <div className="status-card-top">
        <div className="status-tags-left">
          <span className="status-train-badge">#{trainNumber}</span>
          <span className={`status-delay-badge ${isLate ? 'delayed' : 'ontime'}`}>
            <span className="delay-icon">{isLate ? '⏱️' : '✓'}</span>
            {delayText}
          </span>
          {!isLiveGps && (
            <span className="status-gps-unavailable-badge" title={statusMsg}>
              ⚠️ Live Location Unavailable
            </span>
          )}
        </div>

        <div className="status-tags-right">
          <span className="status-eta-label">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            ETA: {etaText}
          </span>
          {onRefresh && (
            <button className="status-refresh-btn" onClick={onRefresh} aria-label="Refresh telemetry">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Train Name & Route Subtitle */}
      <div className="status-title-section">
        <h1 className="status-train-name">{trainName}</h1>
        <p className="status-train-route">
          {routeOrigin} → {routeDest}
        </p>
      </div>

      {/* Status Notice Banner if live GPS is inactive */}
      {!isLiveGps && (
        <div className="status-notice-banner">
          <span className="status-notice-icon">ℹ️</span>
          <span>{statusMsg}</span>
        </div>
      )}

      {/* 3 Metric Columns */}
      <div className="status-metrics-grid">
        {/* Metric 1: Current / Last Station */}
        <div className="status-metric-col">
          <div className="metric-icon-wrap green">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
          </div>
          <div className="metric-content">
            <span className="metric-label">CURRENT / LAST STATION</span>
            <span className="metric-value-primary">{currentStationName}</span>
            <span className="metric-subtext">{platform}</span>
          </div>
        </div>

        {/* Metric 2: Live Speed */}
        <div className="status-metric-col">
          <div className="metric-icon-wrap blue">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
              <circle cx="12" cy="12" r="4"/>
              <path d="m12 12 3-3"/>
            </svg>
          </div>
          <div className="metric-content">
            <span className="metric-label">LIVE SPEED</span>
            <div className="metric-value-row">
              <span className="metric-value-primary">{isLiveGps ? speedKmh : '--'}</span>
              <span className="metric-unit">{isLiveGps ? 'km/h' : ''}</span>
            </div>
          </div>
        </div>

        {/* Metric 3: Distance Covered & Progress Ring */}
        <div className="status-metric-col distance-col">
          <div className="metric-content">
            <span className="metric-label">DISTANCE COVERED</span>
            <div className="metric-value-row">
              <span className="metric-value-primary">{coveredKm} km</span>
              <span className="metric-separator">/</span>
              <span className="metric-value-secondary">{totalKm} km</span>
            </div>
            <span className="metric-subtext">{remainingKm} km remaining</span>
          </div>

          <div className="metric-progress-ring">
            <svg width="58" height="58" viewBox="0 0 58 58">
              <circle
                cx="29"
                cy="29"
                r={radius}
                stroke="#e2e8f0"
                strokeWidth={strokeWidth}
                fill="transparent"
              />
              <circle
                cx="29"
                cy="29"
                r={radius}
                stroke="#0284c7"
                strokeWidth={strokeWidth}
                fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                transform="rotate(-90 29 29)"
              />
            </svg>
            <span className="progress-ring-text">{percent}%</span>
          </div>
        </div>
      </div>

      {/* Card Footer: Auto-refresh & Freshness */}
      <div className="status-card-footer">
        <span className="footer-refresh-label">Auto-refreshes every 30 seconds</span>
        <span className="footer-updated-label">
          Updated {secondsAgo < 5 ? 'Just now' : `${secondsAgo}s ago`}
        </span>
      </div>
    </div>
  );
}
