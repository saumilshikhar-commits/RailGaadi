import { useState } from 'react';
import type { GeoFeature, GeoFeatureCategory } from '../../types';
import './GeoContextWidget.css';

interface GeoContextWidgetProps {
  features: GeoFeature[] | null;
  activeCategories: GeoFeatureCategory[];
  onToggleCategory: (cat: GeoFeatureCategory) => void;
  isLoading?: boolean;
}

const CATEGORY_MAP: Record<GeoFeatureCategory, { icon: string; label: string; color: string }> = {
  river:             { icon: '🌊', label: 'Rivers',      color: '#38bdf8' },
  lake:              { icon: '💧', label: 'Lakes',       color: '#60a5fa' },
  mountain:          { icon: '⛰️', label: 'Mountains',   color: '#6ee7b7' },
  ghat:              { icon: '🏔️', label: 'Ghats',       color: '#34d399' },
  bridge:            { icon: '🌉', label: 'Bridges',     color: '#fb923c' },
  tunnel:            { icon: '🚇', label: 'Tunnels',     color: '#a78bfa' },
  monument:          { icon: '🏛️', label: 'Monuments',   color: '#f59e0b' },
  tourist_attraction:{ icon: '📍', label: 'Attractions', color: '#f472b6' },
  city:              { icon: '🏙️', label: 'Cities',      color: '#e2e8f0' },
  district:          { icon: '🗺️', label: 'Districts',   color: '#94a3b8' },
};

const ALL_CATEGORIES: GeoFeatureCategory[] = [
  'river', 'lake', 'mountain', 'ghat', 'bridge', 'tunnel', 'monument', 'tourist_attraction', 'city', 'district',
];

export function GeoContextWidget({
  features,
  activeCategories,
  onToggleCategory,
  isLoading,
}: GeoContextWidgetProps) {
  const [showAll, setShowAll] = useState(false);

  // Filter by active categories then sort by distance
  const filtered = (features ?? [])
    .filter(f => activeCategories.length === 0 || activeCategories.includes(f.category))
    .sort((a, b) => (a.distanceFromRouteKm ?? 999) - (b.distanceFromRouteKm ?? 999));

  const visible = showAll ? filtered : filtered.slice(0, 8);
  const totalCount = filtered.length;

  return (
    <div className="geo-context-widget" aria-label="Geographic context layers" role="region">
      <div className="geo-header">
        <div className="geo-title-group">
          <span className="geo-icon" aria-hidden="true">🧭</span>
          <div>
            <h3 className="geo-title">Geographic Context</h3>
            <span className="geo-subtitle">Overpass OSM landmarks near your route</span>
          </div>
        </div>
        {totalCount > 0 && (
          <span className="geo-count-badge">{totalCount} features</span>
        )}
      </div>

      {/* Layer Toggles — all 10 categories */}
      <div className="layer-toggles" role="group" aria-label="Toggle geographic map layers">
        {ALL_CATEGORIES.map(cat => {
          const isSelected = activeCategories.includes(cat);
          const meta = CATEGORY_MAP[cat];
          return (
            <button
              key={cat}
              className={`layer-chip ${isSelected ? 'selected' : ''}`}
              onClick={() => onToggleCategory(cat)}
              aria-pressed={isSelected}
              style={isSelected ? { '--chip-color': meta.color } as React.CSSProperties : undefined}
            >
              <span className="chip-icon" aria-hidden="true">{meta.icon}</span>
              <span className="chip-label">{meta.label}</span>
            </button>
          );
        })}
      </div>

      {/* Feature List */}
      {isLoading ? (
        <div className="geo-loading-grid" aria-busy="true" aria-label="Loading geographic features">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="geo-skeleton-item" />
          ))}
        </div>
      ) : visible.length > 0 ? (
        <>
          <div className="geo-features-list" role="list">
            {visible.map(feat => {
              const catMeta = CATEGORY_MAP[feat.category] ?? { icon: '📍', label: feat.category, color: '#94a3b8' };
              return (
                <div
                  key={feat.id}
                  className="geo-feature-item"
                  role="listitem"
                  aria-label={`${feat.name}, ${catMeta.label}${feat.distanceFromRouteKm != null ? `, ${feat.distanceFromRouteKm.toFixed(1)} km from route` : ''}`}
                  style={{ '--item-accent': catMeta.color } as React.CSSProperties}
                >
                  <span className="feat-icon" aria-hidden="true">{catMeta.icon}</span>
                  <div className="feat-info">
                    <span className="feat-name">{feat.name}</span>
                    <span className="feat-cat">{catMeta.label}</span>
                  </div>
                  {feat.distanceFromRouteKm != null && (
                    <span className="feat-dist">{feat.distanceFromRouteKm.toFixed(1)} km</span>
                  )}
                </div>
              );
            })}
          </div>
          {totalCount > 8 && (
            <button
              className="geo-show-more-btn"
              onClick={() => setShowAll(v => !v)}
              aria-expanded={showAll}
            >
              {showAll ? `Show less ↑` : `Show all ${totalCount} features ↓`}
            </button>
          )}
        </>
      ) : (
        <div className="geo-empty" role="status">
          {activeCategories.length === 0
            ? 'Select layers above to discover landmarks along the route.'
            : 'No landmarks found for selected layers. Try enabling more categories.'}
        </div>
      )}
    </div>
  );
}
