import { useRef, useEffect, useState, useId } from 'react';
import type { StationStop } from '../../types';
import { formatDelay } from '../../hooks/utils';
import './StationTimeline.css';

interface StationTimelineProps {
  stops: StationStop[];
  currentStationCode?: string;
  onSelectStation?: (stop: StationStop) => void;
}

export function StationTimeline({
  stops,
  currentStationCode,
  onSelectStation,
}: StationTimelineProps) {
  const currentRef = useRef<HTMLDivElement>(null);
  const [filterQuery, setFilterQuery] = useState('');
  const searchId = useId();

  // Auto-scroll to current station
  useEffect(() => {
    if (currentRef.current) {
      currentRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentStationCode]);

  if (!stops || stops.length === 0) {
    return (
      <div className="station-timeline-card empty" role="status" aria-label="Station schedule unavailable">
        <div className="timeline-empty-state">
          <span className="timeline-empty-icon">🚉</span>
          <p>No station schedule available.</p>
          <span className="timeline-empty-sub">Schedule will appear once the train is tracked.</span>
        </div>
      </div>
    );
  }

  // Find index of current station or last completed
  let currentIdx = stops.findIndex(s => s.isCurrent || (currentStationCode && s.code === currentStationCode));
  if (currentIdx === -1) {
    const lastPassedIdx = stops.reduce((acc, s, idx) => (s.isPassed ? idx : acc), -1);
    currentIdx = lastPassedIdx >= 0 ? Math.min(lastPassedIdx + 1, stops.length - 1) : 0;
  }

  // Filter stops
  const q = filterQuery.toLowerCase().trim();
  const filteredStops = q
    ? stops.filter(s => s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q))
    : stops;

  // Stats
  const passedCount = stops.filter((s, i) => s.isPassed || (currentIdx >= 0 && i < currentIdx)).length;
  const hasCurrentStop = stops.some(s => s.isCurrent) || (currentIdx >= 0 && currentIdx < stops.length);
  const upcomingCount = Math.max(0, stops.length - passedCount - (hasCurrentStop ? 1 : 0));
  const completionPct = stops.length > 1 ? Math.min(100, Math.round((passedCount / (stops.length - 1)) * 100)) : 0;

  return (
    <div className="station-timeline-card" role="region" aria-label="Station Route Timeline">
      <div className="timeline-header">
        <div className="timeline-title-row">
          <h2 className="timeline-title">Station Timeline</h2>
          <span className="timeline-count" aria-label={`${stops.length} stations`}>{stops.length} Stations</span>
        </div>

        {/* Completion progress */}
        <div className="timeline-progress-bar-wrap" role="progressbar" aria-valuenow={completionPct} aria-valuemin={0} aria-valuemax={100} aria-label={`Journey ${completionPct}% complete`}>
          <div className="timeline-progress-bar" style={{ width: `${completionPct}%` }} />
        </div>
        <div className="timeline-progress-label">
          <span>{passedCount} passed</span>
          <span className="timeline-pct-label">{completionPct}% complete</span>
          <span>{upcomingCount} upcoming</span>
        </div>

        {/* Search Filter */}
        <div className="timeline-search-wrap">
          <label htmlFor={searchId} className="sr-only">Filter stations</label>
          <div className="timeline-search-box">
            <svg className="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              id={searchId}
              type="search"
              className="timeline-search-input"
              placeholder="Filter stations…"
              value={filterQuery}
              onChange={e => setFilterQuery(e.target.value)}
              aria-controls="timeline-list"
              autoComplete="off"
            />
            {filterQuery && (
              <button className="search-clear-btn" onClick={() => setFilterQuery('')} aria-label="Clear filter">✕</button>
            )}
          </div>
          {q && (
            <span className="search-result-count" role="status" aria-live="polite">
              {filteredStops.length} result{filteredStops.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      <div className="timeline-list" id="timeline-list" role="list">
        {filteredStops.length === 0 ? (
          <div className="timeline-no-results" role="status">No stations match "{filterQuery}"</div>
        ) : (
          filteredStops.map((stop, filteredIdx) => {
            const origIdx = stops.indexOf(stop);
            const isCompleted = stop.isPassed || origIdx < currentIdx;
            const isCurrent = origIdx === currentIdx || stop.code === currentStationCode || stop.isCurrent;
            const isUpcoming = !isCompleted && !isCurrent;
            const isLast = filteredIdx === filteredStops.length - 1;

            const { label: delayText, isLate } = formatDelay(stop.delayMinutes);

            return (
              <div
                key={stop.code}
                ref={isCurrent ? currentRef : undefined}
                className={`timeline-item ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''} ${isUpcoming ? 'upcoming' : ''}`}
                onClick={() => onSelectStation?.(stop)}
                role="listitem"
                aria-current={isCurrent ? 'step' : undefined}
                aria-label={`${stop.name} (${stop.code})${isCurrent ? ', current station' : isCompleted ? ', passed' : ''}`}
                tabIndex={onSelectStation ? 0 : undefined}
                onKeyDown={e => e.key === 'Enter' && onSelectStation?.(stop)}
              >
                {/* Timeline Connector Node */}
                <div className="timeline-node-wrap" aria-hidden="true">
                  <div className={`timeline-node ${isCompleted ? 'completed-node' : isCurrent ? 'current-node' : 'upcoming-node'}`}>
                    {isCompleted ? (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    ) : isCurrent ? (
                      <span className="current-pulse-inner" />
                    ) : (
                      <span className="upcoming-dot" />
                    )}
                  </div>
                  {!isLast && (
                    <div className={`timeline-line ${isCompleted ? 'completed-line' : ''}`} />
                  )}
                </div>

                {/* Station Info Content */}
                <div className="timeline-content">
                  <div className="timeline-station-main">
                    <div className="station-name-row">
                      <span className="station-name">{stop.name}</span>
                      <span className="station-code">{stop.code}</span>
                      {isCurrent && (
                        <span className="live-location-tag" aria-label="Current live location">LIVE</span>
                      )}
                    </div>

                    <div className="station-meta-row">
                      {stop.platform && (
                        <span className="station-platform" aria-label={`Platform ${stop.platform}`}>PF {stop.platform}</span>
                      )}
                      {stop.distanceKm != null && (
                        <span className="station-distance" aria-label={`${stop.distanceKm} kilometres from origin`}>{stop.distanceKm} km</span>
                      )}
                    </div>
                  </div>

                  {/* Time & Delay */}
                  <div className="timeline-time-col">
                    <span className="scheduled-time" aria-label="Scheduled time">
                      {stop.scheduledArrival ?? stop.scheduledDeparture ?? '--:--'}
                    </span>
                    {stop.delayMinutes !== undefined && (
                      <span className={`timeline-delay ${isLate ? 'late' : 'ontime'}`} aria-label={`${isLate ? 'Late' : 'On time'}: ${delayText}`}>
                        {delayText}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
