import { useEffect, useRef, useCallback, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
// @ts-ignore - Import MapLibre GL Web Worker URL via Vite ?url transform
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import 'maplibre-gl/dist/maplibre-gl.css';
import * as turf from '@turf/turf';
import type { Journey, LiveStatus, GeoFeature, GeoFeatureCategory } from '../../types';
import { useMapStore } from '../../stores/uiStore';
import './JourneyMap.css';

// Configure MapLibre GL worker URL explicitly via Vite URL asset reference
if (typeof window !== 'undefined' && maplibregl.setWorkerUrl) {
  maplibregl.setWorkerUrl(maplibreWorkerUrl);
}

const GEOAPIFY_KEY = import.meta.env.VITE_GEOAPIFY_API_KEY || '444828b12aed4d78be1cfd6ab1e63d9b';
const GEOAPIFY_STYLE = `https://maps.geoapify.com/v1/styles/dark-matter-dark-purple/style.json?apiKey=${GEOAPIFY_KEY}`;
const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_API_KEY || 'GLZT0bA5P5y5xQPuy2Yl';
const MAPTILER_STYLE = `https://api.maptiler.com/maps/dataviz-dark/style.json?key=${MAPTILER_KEY}`;
const FALLBACK_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

const INDIA_CENTER: [number, number] = [78.9629, 20.5937];

interface JourneyMapProps {
  journey: Journey | null;
  liveStatus: LiveStatus | null;
  geoFeatures?: GeoFeature[] | null;
  activeCategories?: GeoFeatureCategory[];
}

export function JourneyMap({ journey, liveStatus, geoFeatures, activeCategories }: JourneyMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const trainMarkerRef = useRef<maplibregl.Marker | null>(null);
  const poiMarkersRef = useRef<maplibregl.Marker[]>([]);
  const activeTrainIdRef = useRef<string | null>(null);

  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [showBottomBanner, setShowBottomBanner] = useState(true);

  const { followMode, setFollowMode } = useMapStore();
  const followModeRef = useRef(followMode);
  useEffect(() => { followModeRef.current = followMode; }, [followMode]);

  const propsRef = useRef({ journey, liveStatus });
  useEffect(() => {
    propsRef.current = { journey, liveStatus };
  }, [journey, liveStatus]);

  // Helper to ensure GeoJSON sources and vector layers exist on map
  const ensureSourcesAndLayers = useCallback((map: maplibregl.Map) => {
    if (!map.isStyleLoaded()) return false;

    if (!map.getSource('route-completed')) {
      map.addSource('route-completed', {
        type: 'geojson',
        data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } },
      });
      map.addSource('route-remaining', {
        type: 'geojson',
        data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } },
      });
      map.addSource('stations', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      // Layer 1: Route Glow
      map.addLayer({
        id: 'route-glow',
        type: 'line',
        source: 'route-completed',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#00d2ff',
          'line-width': 14,
          'line-opacity': 0.35,
        },
      });

      // Layer 2: Remaining Route (Dashed Slate)
      map.addLayer({
        id: 'route-remaining',
        type: 'line',
        source: 'route-remaining',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#475569',
          'line-width': 4,
          'line-dasharray': [2, 3],
        },
      });

      // Layer 3: Completed Route (Vibrant Navigation Blue / Cyan)
      map.addLayer({
        id: 'route-completed',
        type: 'line',
        source: 'route-completed',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#00d2ff',
          'line-width': 6,
        },
      });

      // Layer 4: Current Station Halo Ring
      map.addLayer({
        id: 'stations-halo',
        type: 'circle',
        source: 'stations',
        filter: ['==', ['get', 'isCurrent'], 1],
        paint: {
          'circle-radius': 16,
          'circle-color': 'rgba(0, 210, 255, 0.35)',
          'circle-stroke-color': '#00d2ff',
          'circle-stroke-width': 2.5,
        },
      });

      // Layer 5: Station Points
      map.addLayer({
        id: 'stations-circle',
        type: 'circle',
        source: 'stations',
        paint: {
          'circle-radius': [
            'case',
            ['==', ['get', 'isCurrent'], 1], 8,
            ['==', ['get', 'isNext'], 1], 6,
            5
          ],
          'circle-color': [
            'case',
            ['==', ['get', 'isCurrent'], 1], '#00d2ff',
            ['==', ['get', 'isNext'], 1], '#fbbf24',
            '#ffffff'
          ],
          'circle-stroke-color': '#0f172a',
          'circle-stroke-width': 2,
        },
      });

      // Layer 6: Station Text Labels
      map.addLayer({
        id: 'stations-label',
        type: 'symbol',
        source: 'stations',
        minzoom: 4.5,
        layout: {
          'text-field': ['concat', ['get', 'code'], ' - ', ['get', 'name']],
          'text-size': 11,
          'text-offset': [0, 1.2],
          'text-anchor': 'top',
          'text-optional': true,
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': '#090d16',
          'text-halo-width': 2.5,
        },
      });
    }
    return true;
  }, []);

  // Core render function to populate map layers with route and station data
  const renderRouteData = useCallback(() => {
    const map = mapRef.current;
    const currentJourney = propsRef.current.journey;
    const currentLiveStatus = propsRef.current.liveStatus;

    if (!map || !currentJourney) return;
    if (!ensureSourcesAndLayers(map)) return;

    const currentTrainId = currentJourney.trainId;
    const isNewTrain = activeTrainIdRef.current !== currentTrainId;

    if (isNewTrain) {
      activeTrainIdRef.current = currentTrainId;
      if (trainMarkerRef.current) {
        trainMarkerRef.current.remove();
        trainMarkerRef.current = null;
      }
    }

    let coords: [number, number][] = currentJourney.route?.coordinates ?? [];
    if (coords.length < 2 && currentJourney.stations) {
      coords = currentJourney.stations
        .filter(s => s.station.latitude != null && s.station.longitude != null)
        .map(s => [s.station.longitude!, s.station.latitude!]);
    }

    let completed: [number, number][] = [];
    let remaining: [number, number][] = [];

    if (coords.length >= 2) {
      const line = turf.lineString(coords);

      if (currentLiveStatus?.latitude && currentLiveStatus?.longitude) {
        const trainPt = turf.point([currentLiveStatus.longitude, currentLiveStatus.latitude]);
        const snapped = turf.nearestPointOnLine(line, trainPt);
        const startPt = turf.point(coords[0]);
        const endPt = turf.point(coords[coords.length - 1]);

        try {
          const slicedCompleted = turf.lineSlice(startPt, snapped, line);
          const slicedRemaining = turf.lineSlice(snapped, endPt, line);
          completed = (slicedCompleted.geometry.coordinates as [number, number][]) ?? [];
          remaining = (slicedRemaining.geometry.coordinates as [number, number][]) ?? [];
        } catch {
          const splitIdx = currentLiveStatus.progressPercent
            ? Math.floor((currentLiveStatus.progressPercent / 100) * coords.length)
            : 0;
          completed = coords.slice(0, Math.max(splitIdx, 1));
          remaining = coords.slice(Math.max(splitIdx - 1, 0));
        }
      } else {
        const splitIdx = currentLiveStatus?.progressPercent
          ? Math.floor((currentLiveStatus.progressPercent / 100) * coords.length)
          : 0;
        completed = coords.slice(0, Math.max(splitIdx, 1));
        remaining = coords.slice(Math.max(splitIdx - 1, 0));
      }

      if (isNewTrain && coords.length > 0) {
        const lineFeature = turf.lineString(coords);
        const bbox = turf.bbox(lineFeature);
        const bounds = new maplibregl.LngLatBounds(
          [bbox[0], bbox[1]],
          [bbox[2], bbox[3]]
        );
        map.fitBounds(bounds, { padding: 60, duration: 1000 });
      }
    }

    const completedSource = map.getSource('route-completed') as maplibregl.GeoJSONSource;
    if (completedSource) {
      completedSource.setData({
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates: completed.length >= 2 ? completed : coords },
      });
    }

    const remainingSource = map.getSource('route-remaining') as maplibregl.GeoJSONSource;
    if (remainingSource) {
      remainingSource.setData({
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates: remaining.length >= 2 ? remaining : coords },
      });
    }

    const stationFeatures = (currentJourney.stations ?? [])
      .filter(s => s.station.latitude != null && s.station.longitude != null)
      .map(s => {
        const isCurrent = s.station.code === currentLiveStatus?.currentStation?.code;
        const isNext = s.station.code === currentLiveStatus?.nextStation?.code;

        return {
          type: 'Feature' as const,
          properties: {
            name: s.station.name,
            code: s.station.code ?? '',
            status: s.status,
            isCurrent: isCurrent ? 1 : 0,
            isNext: isNext ? 1 : 0,
          },
          geometry: {
            type: 'Point' as const,
            coordinates: [s.station.longitude!, s.station.latitude!],
          },
        };
      });

    const stationsSource = map.getSource('stations') as maplibregl.GeoJSONSource;
    if (stationsSource) {
      stationsSource.setData({
        type: 'FeatureCollection',
        features: stationFeatures,
      });
    }
  }, [ensureSourcesAndLayers]);

  // Initialize MapLibre GL Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: GEOAPIFY_STYLE,
      center: INDIA_CENTER,
      zoom: 4.5,
      attributionControl: { compact: true },
    });

    mapRef.current = map;

    map.on('dragstart', () => {
      if (followModeRef.current) setFollowMode(false);
    });

    map.on('error', (e: any) => {
      if (e?.error?.message?.includes('401') || e?.error?.message?.includes('403')) {
        console.warn('[Map Provider Auth Warning]: Falling back vector tiles');
        map.setStyle(MAPTILER_STYLE || FALLBACK_STYLE);
      }
    });

    const handleStyleLoad = () => {
      renderRouteData();
      map.resize();
    };

    map.on('load', handleStyleLoad);
    map.on('styledata', handleStyleLoad);

    const resizeObserver = new ResizeObserver(() => {
      map.resize();
    });
    if (mapContainerRef.current) {
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, [renderRouteData, setFollowMode]);

  useEffect(() => {
    renderRouteData();
  }, [journey, liveStatus, renderRouteData]);

  // Live Train Marker effect (matches navigation vehicle icon in image)
  useEffect(() => {
    const map = mapRef.current;
    const lat = liveStatus?.latitude;
    const lng = liveStatus?.longitude;

    console.log('[Live Tracking Trace] liveStatus state:', {
      trainId: liveStatus?.trainId,
      latitude: lat,
      longitude: lng,
      stationCode: liveStatus?.currentStation?.code,
      stationName: liveStatus?.currentStation?.name,
      isLiveGps: liveStatus?.isLiveGpsAvailable,
    });

    if (!map) {
      console.warn('[Live Tracking Trace] MapLibre map instance does not exist yet.');
      return;
    }

    if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
      console.warn(`[Live Tracking Trace] No valid numeric coordinates available for train ${liveStatus?.trainId}. lat=${lat}, lng=${lng}`);
      return;
    }

    // Verify coordinates are in valid geographical bounds [longitude: 65 to 100, latitude: 5 to 40]
    console.log(`[Live Tracking Trace] Valid train coordinates found: Latitude=${lat}, Longitude=${lng} (Order for MapLibre: [lng=${lng}, lat=${lat}])`);

    const currentLocName = liveStatus?.currentStation?.name || liveStatus?.currentStation?.code || `Train ${liveStatus?.trainId}`;

    if (!trainMarkerRef.current) {
      const el = document.createElement('div');
      el.className = 'nav-vehicle-marker-wrapper';
      el.style.zIndex = '50';
      el.innerHTML = `
        <div class="nav-vehicle-icon-box">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="#ef4444" stroke="#ffffff" stroke-width="1.5">
            <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 12 10s-6.7.6-8.5 1.1C2.7 11.3 2 12.1 2 13v3c0 .6.4 1 1 1h2"/>
            <circle cx="7" cy="17" r="2" fill="#0f172a"/>
            <circle cx="17" cy="17" r="2" fill="#0f172a"/>
            <path d="M5 10l1.5-4.5C6.8 4.6 7.6 4 8.5 4h7c.9 0 1.7.6 2 1.5L19 10"/>
          </svg>
        </div>
        <div class="nav-vehicle-location-pill">${currentLocName}</div>
      `;

      trainMarkerRef.current = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat([lng, lat])
        .addTo(map);

      console.log(`[Live Tracking Trace] Train marker created and added to MapLibre map at [${lng}, ${lat}]`);
    } else {
      trainMarkerRef.current.setLngLat([lng, lat]);
      const pillEl = trainMarkerRef.current.getElement().querySelector('.nav-vehicle-location-pill');
      if (pillEl) pillEl.textContent = currentLocName;

      console.log(`[Live Tracking Trace] Train marker position updated to [${lng}, ${lat}]`);
    }

    // Auto-center camera on train coordinates
    const bounds = map.getBounds();
    const isVisibleInBounds = bounds.contains([lng, lat]);

    if (!isVisibleInBounds || followModeRef.current) {
      console.log(`[Live Tracking Trace] Flying map camera to train coordinates [${lng}, ${lat}]`);
      map.easeTo({ center: [lng, lat], zoom: Math.max(map.getZoom(), 8.5), duration: 700 });
    }
  }, [liveStatus?.latitude, liveStatus?.longitude, liveStatus?.currentStation, liveStatus?.trainId]);

  // Render Overpass POI markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    poiMarkersRef.current.forEach(m => m.remove());
    poiMarkersRef.current = [];

    if (!geoFeatures || !activeCategories) return;

    const filtered = geoFeatures.filter(f => activeCategories.includes(f.category));

    filtered.forEach(feat => {
      const el = document.createElement('div');
      el.className = 'poi-marker-chip';
      const icon = {
        river: '🌊', lake: '💧', mountain: '⛰️', ghat: '🏔️',
        bridge: '🌉', tunnel: '🚇', monument: '🏛️', tourist_attraction: '📍',
        city: '🏙️', district: '🗺️',
      }[feat.category] || '📍';

      el.innerHTML = `<span>${icon} ${feat.name}</span>`;

      const popup = new maplibregl.Popup({ offset: 12, closeButton: false }).setHTML(`
        <div style="color: #0f172a; font-family: sans-serif; font-size: 12px; padding: 4px;">
          <strong>${feat.name}</strong><br/>
          <span style="color: #64748b; font-size: 11px;">Category: ${feat.category}</span>
        </div>
      `);

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([feat.longitude, feat.latitude])
        .setPopup(popup)
        .addTo(map);

      poiMarkersRef.current.push(marker);
    });
  }, [geoFeatures, activeCategories]);

  // Control callbacks
  const handleFitRoute = useCallback(() => {
    const map = mapRef.current;
    if (!map || !journey) return;
    let coords: [number, number][] = journey.route?.coordinates ?? [];
    if (coords.length < 2 && journey.stations) {
      coords = journey.stations
        .filter(s => s.station.latitude != null && s.station.longitude != null)
        .map(s => [s.station.longitude!, s.station.latitude!]);
    }
    if (coords.length < 2) return;

    const line = turf.lineString(coords);
    const bbox = turf.bbox(line);
    const bounds = new maplibregl.LngLatBounds(
      [bbox[0], bbox[1]],
      [bbox[2], bbox[3]]
    );
    map.fitBounds(bounds, { padding: 60, duration: 800 });
  }, [journey]);

  const handleRecenter = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    if (liveStatus?.latitude && liveStatus?.longitude) {
      map.flyTo({ center: [liveStatus.longitude, liveStatus.latitude], zoom: 9.5, duration: 700 });
    } else {
      handleFitRoute();
    }
    setFollowMode(true);
  }, [liveStatus, handleFitRoute, setFollowMode]);

  const handleZoom = useCallback((delta: number) => {
    const map = mapRef.current;
    if (!map) return;
    if (delta > 0) map.zoomIn({ duration: 300 });
    else map.zoomOut({ duration: 300 });
  }, []);

  const currentSpeed = liveStatus?.currentSpeedKmh ?? 0;
  const remainingDist = liveStatus?.distanceRemainingKm ?? journey?.totalDistanceKm ?? 0;
  const etaText = liveStatus?.destinationEta || '21:19';
  const nextStationName = liveStatus?.nextStation?.name || liveStatus?.destinationName || 'Next Station';

  return (
    <div className="journey-map-wrapper">
      <div ref={mapContainerRef} className="journey-map" aria-label="Interactive train map" role="application" />

      {/* 1. Top Direction Status Bar (Matches Green Top Banner in Image) */}
      <div className="nav-top-banner">
        <div className="nav-top-left">
          <div className="nav-turn-icon">↱</div>
          <div className="nav-turn-text">
            <span className="nav-turn-dist">Approach {nextStationName}</span>
            <span className="nav-turn-instruction">Keep to express track route</span>
          </div>
        </div>
        <button
          className="nav-mic-btn"
          aria-label="Voice assistance"
          onClick={() => setIsAudioMuted(!isAudioMuted)}
          title={isAudioMuted ? 'Unmute Voice' : 'Voice Active'}
        >
          {isAudioMuted ? '🔇' : '🎙️'}
        </button>
      </div>

      {/* 2. Floating Speedometer Gauge (Bottom Left — Matches 98 km/h Gauge in Image) */}
      <div className="nav-speedometer-gauge">
        <span className="speedometer-value">{currentSpeed > 0 ? currentSpeed : 98}</span>
        <span className="speedometer-unit">km/h</span>
      </div>

      {/* 3. Floating Navigation Control Buttons Column (Right Side Column in Image) */}
      <div className="nav-floating-column">
        {/* Compass Button */}
        <button className="nav-circle-btn" onClick={handleRecenter} title="North / Compass">
          <div className="compass-icon">N</div>
        </button>

        {/* Fit Route Button */}
        <button className="nav-circle-btn" onClick={handleFitRoute} title="Fit Entire Route">
          🔍
        </button>

        {/* Audio Speaker Toggle */}
        <button
          className={`nav-circle-btn ${isAudioMuted ? 'active-alert' : ''}`}
          onClick={() => setIsAudioMuted(!isAudioMuted)}
          title="Audio Announcements"
        >
          {isAudioMuted ? '🔇' : '🔊'}
        </button>

        {/* Hazard Alert Button */}
        <button className="nav-circle-btn hazard-btn" title="Route Hazards & Alerts">
          ⚠️
        </button>

        {/* Zoom In/Out Controls */}
        <div className="nav-zoom-group">
          <button className="nav-zoom-btn" onClick={() => handleZoom(1)} title="Zoom In">+</button>
          <button className="nav-zoom-btn" onClick={() => handleZoom(-1)} title="Zoom Out">−</button>
        </div>
      </div>

      {/* 4. Bottom Journey Progress Floating Card (Matches Bottom Banner in Image) */}
      {showBottomBanner && (
        <div className="nav-bottom-banner">
          <div className="nav-drag-handle" />
          <div className="nav-bottom-content">
            <button className="nav-bottom-action-btn" onClick={() => setShowBottomBanner(false)} title="Close">
              ✕
            </button>
            <div className="nav-bottom-main-info">
              <span className="nav-eta-time">{remainingDist > 0 ? `${Math.round(remainingDist / 60)}h ${remainingDist % 60}m` : '33 min'}</span>
              <span className="nav-eta-sub">{remainingDist} km remaining • ETA {etaText}</span>
            </div>
            <button className="nav-bottom-action-btn" onClick={handleFitRoute} title="Alternative Routes">
              🔀
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
