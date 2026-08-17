import type {
  ApiResponse,
  ApiSuccess,
  Train,
  Journey,
  LiveStatus,
  TrainWeather,
  ElevationSummary,
  GeoFeature,
  GeoFeatureCategory,
  DevConfigStatus,
} from '../types';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

export class ApiClientError extends Error {
  code: string;
  status?: number;

  constructor(code: string, message: string, status?: number) {
    super(message);
    this.name = 'ApiClientError';
    this.code = code;
    this.status = status;
  }
}

async function apiRequest<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Accept': 'application/json' },
    signal,
  });

  const json: ApiResponse<T> = await res.json();

  if (json.error) {
    throw new ApiClientError(json.error.code, json.error.message, res.status);
  }

  return (json as ApiSuccess<T>).data;
}

export const api = {
  searchTrains: (q: string, signal?: AbortSignal) =>
    apiRequest<Train[]>(`/api/v1/trains/search?q=${encodeURIComponent(q)}`, signal),

  getJourney: (trainId: string, signal?: AbortSignal) =>
    apiRequest<Journey>(`/api/v1/trains/${trainId}/journey`, signal),

  getLiveStatus: (trainId: string, signal?: AbortSignal) =>
    apiRequest<LiveStatus>(`/api/v1/trains/${trainId}/live`, signal),

  getWeather: (trainId: string, signal?: AbortSignal) =>
    apiRequest<TrainWeather>(`/api/v1/trains/${trainId}/weather`, signal),

  getElevation: (trainId: string, signal?: AbortSignal) =>
    apiRequest<ElevationSummary>(`/api/v1/trains/${trainId}/elevation`, signal),

  getContext: (trainId: string, categories?: GeoFeatureCategory[], signal?: AbortSignal) => {
    const cats = categories && categories.length > 0 ? `?categories=${categories.join(',')}` : '';
    return apiRequest<GeoFeature[]>(`/api/v1/trains/${trainId}/context${cats}`, signal);
  },

  getDevConfig: (signal?: AbortSignal) =>
    apiRequest<DevConfigStatus>(`/api/v1/dev/config`, signal),
};
