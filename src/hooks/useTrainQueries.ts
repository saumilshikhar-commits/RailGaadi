import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import type { GeoFeatureCategory } from '../types';

export function useTrainSearch(query: string) {
  return useQuery({
    queryKey: ['trains', 'search', query],
    queryFn: ({ signal }) => api.searchTrains(query, signal),
    enabled: query.trim().length >= 2,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
  });
}

export function useJourney(trainId: string | null) {
  return useQuery({
    queryKey: ['trains', trainId, 'journey'],
    queryFn: ({ signal }) => api.getJourney(trainId!, signal),
    enabled: !!trainId,
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
  });
}

export function useLiveStatus(trainId: string | null, enabled = true) {
  return useQuery({
    queryKey: ['trains', trainId, 'live'],
    queryFn: ({ signal }) => api.getLiveStatus(trainId!, signal),
    enabled: !!trainId && enabled,
    refetchInterval: (query) => {
      if (query.state.data?.status === 'completed') return false;
      if (query.state.errorUpdateCount > 3) return 60_000;
      return 30_000 + Math.random() * 6_000 - 3_000;
    },
    refetchIntervalInBackground: false,
    staleTime: 15_000,
    retry: (failureCount) => failureCount < 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
  });
}

export function useWeather(trainId: string | null) {
  return useQuery({
    queryKey: ['trains', trainId, 'weather'],
    queryFn: ({ signal }) => api.getWeather(trainId!, signal),
    enabled: !!trainId,
    staleTime: 15 * 60 * 1000,
    retry: 1,
  });
}

export function useElevation(trainId: string | null) {
  return useQuery({
    queryKey: ['trains', trainId, 'elevation'],
    queryFn: ({ signal }) => api.getElevation(trainId!, signal),
    enabled: !!trainId,
    staleTime: 24 * 60 * 60 * 1000,
    retry: 1,
  });
}

export function useContextFeatures(trainId: string | null, categories?: GeoFeatureCategory[]) {
  return useQuery({
    queryKey: ['trains', trainId, 'context', categories],
    queryFn: ({ signal }) => api.getContext(trainId!, categories, signal),
    enabled: !!trainId,
    staleTime: 60 * 60 * 1000,
    retry: 1,
  });
}

export function useDevConfig() {
  return useQuery({
    queryKey: ['dev', 'config'],
    queryFn: ({ signal }) => api.getDevConfig(signal),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}
