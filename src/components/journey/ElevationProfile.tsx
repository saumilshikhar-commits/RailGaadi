import { useState } from 'react';
import type { ElevationSummary, StationStop } from '../../types';
import './ElevationProfile.css';

interface ElevationProfileProps {
  elevation: ElevationSummary | null;
  currentDistanceKm?: number;
  delayMinutes?: number;
  totalDistanceKm?: number;
  stops?: StationStop[];
}

export function ElevationProfile({
  elevation,
  currentDistanceKm = 0,
  delayMinutes = 0,
  totalDistanceKm = 0,
  stops = [],
}: ElevationProfileProps) {
  const [hoverPoint, setHoverPoint] = useState<{ distanceKm: number; elevationM: number; x: number; y: number } | null>(null);

  const points = elevation?.points && elevation.points.length > 0
    ? elevation.points
    : [
        { distanceKm: 0, elevationM: 50 },
        { distanceKm: Math.max(10, totalDistanceKm), elevationM: 50 },
      ];

  const highest = elevation?.highestElevationM ?? Math.max(...points.map(p => p.elevationM));
  const lowest = elevation?.lowestElevationM ?? Math.min(...points.map(p => p.elevationM));
  const maxDist = totalDistanceKm || points[points.length - 1]?.distanceKm || 100;

  // Calculate total ascent
  let totalAscent = 0;
  for (let i = 1; i < points.length; i++) {
    const diff = points[i].elevationM - points[i - 1].elevationM;
    if (diff > 0) totalAscent += diff;
  }

  // Generate SVG path coordinates
  const svgWidth = 700;
  const svgHeight = 180;
  const padding = 20;

  const getX = (dist: number) => padding + (dist / maxDist) * (svgWidth - 2 * padding);
  const getY = (elev: number) => {
    const range = Math.max(1, highest - lowest);
    return svgHeight - padding - ((elev - lowest) / range) * (svgHeight - 2 * padding);
  };

  const pathPoints = points.map(p => `${getX(p.distanceKm)},${getY(p.elevationM)}`).join(' L ');
  const areaPath = `M ${getX(0)},${svgHeight - padding} L ${pathPoints} L ${getX(maxDist)},${svgHeight - padding} Z`;
  const linePath = `M ${pathPoints}`;

  // Current train position on SVG curve
  const trainX = getX(currentDistanceKm);

  let trainY = svgHeight / 2;
  for (let i = 0; i < points.length - 1; i++) {
    if (currentDistanceKm >= points[i].distanceKm && currentDistanceKm <= points[i + 1].distanceKm) {
      const ratio = (currentDistanceKm - points[i].distanceKm) / (points[i + 1].distanceKm - points[i].distanceKm || 1);
      const elev = points[i].elevationM + ratio * (points[i + 1].elevationM - points[i].elevationM);
      trainY = getY(elev);
      break;
    }
  }

  // Handle SVG Mouse Hover Inspection
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const scaledX = (mouseX / rect.width) * svgWidth;
    const clampedX = Math.max(padding, Math.min(svgWidth - padding, scaledX));

    const ratio = (clampedX - padding) / (svgWidth - 2 * padding);
    const dist = ratio * maxDist;

    // Find closest data point
    let closest = points[0];
    let minDiff = Math.abs(points[0].distanceKm - dist);
    for (let i = 1; i < points.length; i++) {
      const diff = Math.abs(points[i].distanceKm - dist);
      if (diff < minDiff) {
        minDiff = diff;
        closest = points[i];
      }
    }

    setHoverPoint({
      distanceKm: Math.round(closest.distanceKm),
      elevationM: Math.round(closest.elevationM),
      x: getX(closest.distanceKm),
      y: getY(closest.elevationM),
    });
  };

  const coveredKm = Math.round(currentDistanceKm);

  return (
    <div className="terrain-elevation-container" role="region" aria-label="Terrain and Elevation Profile">
      {/* 4 Metric Cards */}
      <div className="terrain-metrics-grid">
        <div className="terrain-metric-card">
          <div className="metric-card-header">
            <span className="card-icon" style={{ color: '#0284c7' }}>🛣️</span>
            <span className="card-title">TOTAL DISTANCE</span>
          </div>
          <div className="card-value-row">
            <span className="card-value">{maxDist.toLocaleString()}</span>
            <span className="card-unit">km</span>
          </div>
        </div>

        <div className="terrain-metric-card">
          <div className="metric-card-header">
            <span className="card-icon" style={{ color: '#0d9488' }}>⛰️</span>
            <span className="card-title">HIGHEST POINT</span>
          </div>
          <div className="card-value-row">
            <span className="card-value">{highest}</span>
            <span className="card-unit">m</span>
          </div>
        </div>

        <div className="terrain-metric-card">
          <div className="metric-card-header">
            <span className="card-icon" style={{ color: '#f59e0b' }}>📍</span>
            <span className="card-title">COVERED</span>
          </div>
          <div className="card-value-row">
            <span className="card-value">{coveredKm.toLocaleString()}</span>
            <span className="card-unit">km</span>
          </div>
        </div>

        <div className="terrain-metric-card">
          <div className="metric-card-header">
            <span className="card-icon" style={{ color: '#ec4899' }}>⏱️</span>
            <span className="card-title">DELAY</span>
          </div>
          <div className="card-value-row">
            <span className="card-value">{delayMinutes > 0 ? `${delayMinutes}` : '0'}</span>
            <span className="card-unit">min</span>
          </div>
        </div>
      </div>

      {/* Main Elevation Profile Chart Card */}
      <div className="elevation-chart-card">
        <div className="elevation-card-header">
          <div className="elevation-title-wrap">
            <span className="title-mountain-icon">⛰️</span>
            <h3 className="elevation-card-title">OpenTopography Elevation Profile</h3>
          </div>
          <div className="elevation-badges-wrap">
            <span className="peak-badge">
              <span className="peak-icon">↗</span> Peak: {highest}m
            </span>
          </div>
        </div>

        <div className="elevation-svg-wrap">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="elevation-svg"
            preserveAspectRatio="none"
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setHoverPoint(null)}
          >
            <defs>
              <linearGradient id="elevationAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.05" />
              </linearGradient>
            </defs>

            {/* Grid lines */}
            <line x1={padding} y1={svgHeight / 2} x2={svgWidth - padding} y2={svgHeight / 2} stroke="#cbd5e1" strokeDasharray="4 4" opacity="0.5" />

            {/* Area Fill */}
            <path d={areaPath} fill="url(#elevationAreaGrad)" />

            {/* Main Profile Line */}
            <path d={linePath} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

            {/* Live Train Indicator Pin */}
            <circle cx={trainX} cy={trainY} r="6" fill="#0d9488" stroke="#ffffff" strokeWidth="2" />
            <circle cx={trainX} cy={trainY} r="12" fill="none" stroke="#0d9488" strokeWidth="1.5" opacity="0.5" />

            {/* Hover Indicator Hairline & Node */}
            {hoverPoint && (
              <g className="hover-group">
                <line x1={hoverPoint.x} y1={padding} x2={hoverPoint.x} y2={svgHeight - padding} stroke="#0284c7" strokeWidth="1.5" strokeDasharray="2 2" />
                <circle cx={hoverPoint.x} cy={hoverPoint.y} r="5" fill="#0284c7" stroke="#ffffff" strokeWidth="2" />
              </g>
            )}
          </svg>

          {/* Interactive Hover Tooltip */}
          {hoverPoint && (
            <div
              className="elevation-hover-tooltip"
              style={{
                left: `${(hoverPoint.x / svgWidth) * 100}%`,
                top: `${(hoverPoint.y / svgHeight) * 100}%`,
              }}
            >
              <div className="tooltip-title">{hoverPoint.distanceKm} km</div>
              <div className="tooltip-value">Altitude: {hoverPoint.elevationM} m</div>
            </div>
          )}
        </div>

        <div className="elevation-x-axis">
          <span>0 km (Origin)</span>
          <span>{maxDist} km (Destination)</span>
        </div>
      </div>

      {/* Per-Station Delay History Card */}
      <div className="delay-history-card">
        <div className="delay-card-header">
          <div className="delay-title-wrap">
            <span className="delay-card-icon">📊</span>
            <h3 className="delay-card-title">Per-Station Delay History</h3>
          </div>
          <div className={`delay-overall-badge ${delayMinutes > 0 ? 'late' : 'ontime'}`}>
            {delayMinutes > 0 ? `${delayMinutes}m Late` : 'On Time'}
          </div>
        </div>

        <div className="delay-bars-list">
          {(stops.length > 0 ? stops : [
            { code: 'MAS', name: 'MGR CHENNAI CENTRAL', delayMinutes: delayMinutes || 16 },
            { code: 'BBQ', name: 'BASIN BRIDGE JN', delayMinutes: 0 },
            { code: 'KOK', name: 'KORUKKUPET', delayMinutes: 0 },
            { code: 'WST', name: 'WASHERMANPET', delayMinutes: 0 },
            { code: 'TNP', name: 'TONDIARPET', delayMinutes: 0 },
            { code: 'VOC', name: 'V.O.C. NAGAR', delayMinutes: 0 },
            { code: 'TVT', name: 'TIRUVOTTIYUR', delayMinutes: 0 },
            { code: 'WCN', name: 'WIMCO NAGAR', delayMinutes: 0 },
            { code: 'KAVM', name: 'KATHIVAKKAM', delayMinutes: 0 },
            { code: 'ENR', name: 'ENNORE', delayMinutes: 0 },
            { code: 'AIPP', name: 'ATTIPATTU PUDU NAGAR', delayMinutes: 0 },
          ]).slice(0, 14).map(s => {
            const isLate = (s.delayMinutes ?? 0) > 0;
            const barWidth = isLate ? `${Math.min(100, Math.max(25, (s.delayMinutes! / 30) * 100))}%` : '8%';

            return (
              <div key={s.code} className="delay-bar-item">
                <span className="delay-station-code">{s.code}</span>
                <div className="delay-bar-track">
                  <div
                    className={`delay-bar-fill ${isLate ? 'late-fill' : 'ontime-fill'}`}
                    style={{ width: barWidth }}
                  />
                </div>
                <span className={`delay-status-tag ${isLate ? 'late-tag' : 'ontime-tag'}`}>
                  {isLate ? `${s.delayMinutes}m Late` : 'On time'}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
