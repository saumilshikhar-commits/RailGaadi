// Frontend types mirroring server canonical models

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

export type JourneyStatus = 'not_started' | 'running' | 'completed' | 'unknown';
export type StationStatus = 'departed' | 'arrived' | 'at_station' | 'approaching' | 'upcoming' | 'skipped' | 'passed' | 'current' | 'unknown';

export interface JourneyStation {
  station: StationRef;
  sequence: number;
  scheduledArrival?: string;
  scheduledDeparture?: string;
  actualArrival?: string;
  actualDeparture?: string;
  delayMinutes?: number;
  status: StationStatus;
  distanceFromOriginKm?: number;
  distanceKm?: number;
  platform?: string;
}

export interface StationStop {
  name: string;
  code: string;
  scheduledArrival?: string;
  scheduledDeparture?: string;
  actualArrival?: string;
  actualDeparture?: string;
  delayMinutes?: number;
  distanceKm?: number;
  platform?: string;
  isPassed?: boolean;
  isCurrent?: boolean;
}

export interface GeoJSONLineString {
  type: 'LineString';
  coordinates: [number, number][];
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
  etaNextStation?: string;
  etaDestination?: string;
  destinationEta?: string;
  delayMinutes?: number;
  currentSpeedKmh?: number;
  distanceCoveredKm?: number;
  distanceRemainingKm?: number;
  totalDistanceKm?: number;
  progressPercent: number;
  sourceUpdatedAt: string;
  receivedAt: string;
  freshness: FreshnessState;
  status: LiveTrainStatus;
  isLiveGpsAvailable?: boolean;
  trackingMode?: string;
  statusMessage?: string;
  stationStatuses?: Record<string, { status: string; delayMinutes?: number; actualArrival?: string; actualDeparture?: string; platform?: string }>;
}

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
}

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

export interface DevConfigStatus {
  mapTiler: boolean;
  railradar: boolean;
  openWeather: boolean;
  openTopography: boolean;
  overpass: boolean;
}

export interface ApiMeta {
  requestId: string;
  cached?: boolean;
  updatedAt?: string;
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
  error: { code: string; message: string };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// Local storage models
export interface RecentSearch {
  trainId: string;
  trainNumber: string;
  trainName: string;
  searchedAt: string; // ISO
}

export interface FavouriteTrain {
  trainId: string;
  trainNumber: string;
  trainName: string;
  origin?: string;
  destination?: string;
  savedAt: string;
}
