// ─── Train ───────────────────────────────────────────────────────────────────

export interface StationRef {
  id: string;
  code?: string;
  name: string;
  latitude?: number;
  longitude?: number;
  platform?: string;
}

export interface Train {
  id: string;
  number: string;
  name: string;
  origin?: StationRef;
  destination?: StationRef;
  provider: string;
}

// ─── Journey ─────────────────────────────────────────────────────────────────

export type JourneyStatus =
  | 'not_started'
  | 'running'
  | 'completed'
  | 'unknown';

export type StationStatus =
  | 'departed'
  | 'arrived'
  | 'at_station'
  | 'approaching'
  | 'upcoming'
  | 'skipped'
  | 'unknown';

export interface JourneyStation {
  station: StationRef;
  sequence: number;
  scheduledArrival?: string;   // ISO 8601
  scheduledDeparture?: string; // ISO 8601
  actualArrival?: string;
  actualDeparture?: string;
  delayMinutes?: number;
  status: StationStatus;
  distanceFromOriginKm?: number;
}

export interface Journey {
  id: string;
  trainId: string;
  trainName?: string;
  origin: StationRef;
  destination: StationRef;
  stations: JourneyStation[];
  route: GeoJSONLineString;
  totalDistanceKm: number;
  status: JourneyStatus;
}

export interface GeoJSONLineString {
  type: 'LineString';
  coordinates: [number, number][];
}

// ─── Live Status ─────────────────────────────────────────────────────────────

export type FreshnessState = 'fresh' | 'aging' | 'stale' | 'unknown';
export type LiveTrainStatus = 'not_started' | 'running' | 'at_station' | 'completed' | 'unknown';

export interface LiveStatus {
  trainId: string;
  trainName?: string;

  latitude?: number;
  longitude?: number;

  currentStation?: StationRef;
  nextStation?: StationRef;

  originName?: string;
  destinationName?: string;

  etaNextStation?: string; // ISO 8601
  etaDestination?: string;
  destinationEta?: string;

  delayMinutes?: number;
  currentSpeedKmh?: number;

  distanceCoveredKm?: number;
  distanceRemainingKm?: number;
  totalDistanceKm?: number;
  progressPercent: number;

  sourceUpdatedAt: string; // Provider timestamp
  receivedAt: string;      // RailGaadi backend receipt time

  freshness: FreshnessState;
  status: LiveTrainStatus;
  isLiveGpsAvailable?: boolean;
  trackingMode?: string;
  statusMessage?: string;
}

// ─── Weather ─────────────────────────────────────────────────────────────────

export interface WeatherSnapshot {
  name?: string;
  latitude: number;
  longitude: number;
  temperatureC: number;
  humidityPercent?: number;
  windKph?: number;
  rainProbabilityPercent?: number;
  condition: string;
  conditionIcon?: string;
  observedAt: string;
  forecastFor?: string;
}

export interface TrainWeather {
  trainId: string;
  currentStation?: WeatherSnapshot;
  nextStation?: WeatherSnapshot;
  destination?: WeatherSnapshot;
  routeSummary?: string;
  routeCheckpoints?: WeatherSnapshot[];
}

// ─── Elevation ───────────────────────────────────────────────────────────────

export interface ElevationPoint {
  distanceKm: number;
  elevationM: number;
}

export interface ElevationSummary {
  trainId: string;
  points: ElevationPoint[];
  highestElevationM?: number;
  lowestElevationM?: number;
}

// ─── Geographic Features ─────────────────────────────────────────────────────

export type GeoFeatureCategory =
  | 'river'
  | 'lake'
  | 'mountain'
  | 'ghat'
  | 'bridge'
  | 'tunnel'
  | 'monument'
  | 'tourist_attraction'
  | 'city'
  | 'district';

export interface GeoFeature {
  id: string;
  category: GeoFeatureCategory;
  name: string;
  latitude: number;
  longitude: number;
  distanceFromRouteKm?: number;
  metadata?: Record<string, unknown>;
}

// ─── API Response Envelope ───────────────────────────────────────────────────

export interface ApiMeta {
  requestId: string;
  cached?: boolean;
  updatedAt?: string;
  provider?: string;
  freshness?: FreshnessState;
}

export interface ApiSuccess<T> {
  data: T;
  meta: ApiMeta;
  error: null;
}

export interface ApiError {
  data: null;
  meta: ApiMeta;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ─── Search ──────────────────────────────────────────────────────────────────

export interface TrainSearchResult {
  train: Train;
  relevanceScore?: number;
}
