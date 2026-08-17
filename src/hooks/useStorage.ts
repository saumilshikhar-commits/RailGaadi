import { useState, useEffect, useCallback } from 'react';
import type { RecentSearch, FavouriteTrain } from '../types';
import {
  getRecentSearches,
  addRecentSearch as addRecentSearchStorage,
  removeRecentSearch as removeRecentSearchStorage,
  clearRecentSearches as clearRecentSearchesStorage,
  getFavourites,
  isFavourite as isFavouriteStorage,
  removeFavourite as removeFavouriteStorage,
  toggleFavourite as toggleFavouriteStorage,
} from '../services/localStorage';

export function useRecentSearches() {
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>(getRecentSearches());

  const refresh = useCallback(() => {
    setRecentSearches(getRecentSearches());
  }, []);

  const addSearch = useCallback((item: Omit<RecentSearch, 'searchedAt'>) => {
    addRecentSearchStorage(item);
    refresh();
  }, [refresh]);

  const removeSearch = useCallback((trainId: string) => {
    removeRecentSearchStorage(trainId);
    refresh();
  }, [refresh]);

  const clearAll = useCallback(() => {
    clearRecentSearchesStorage();
    refresh();
  }, [refresh]);

  useEffect(() => {
    const handleStorage = () => refresh();
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [refresh]);

  return {
    recentSearches,
    addRecentSearch: addSearch,
    removeRecentSearch: removeSearch,
    clearRecentSearches: clearAll,
  };
}

export function useFavouriteTrains() {
  const [favourites, setFavourites] = useState<FavouriteTrain[]>(getFavourites());

  const refresh = useCallback(() => {
    setFavourites(getFavourites());
  }, []);

  const isFav = useCallback((trainId: string) => {
    return isFavouriteStorage(trainId);
  }, []);

  const toggleFav = useCallback((item: Omit<FavouriteTrain, 'savedAt'>) => {
    const res = toggleFavouriteStorage(item);
    refresh();
    return res;
  }, [refresh]);

  const removeFav = useCallback((trainId: string) => {
    removeFavouriteStorage(trainId);
    refresh();
  }, [refresh]);

  useEffect(() => {
    const handleStorage = () => refresh();
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [refresh]);

  return {
    favourites,
    isFavourite: isFav,
    toggleFavourite: toggleFav,
    removeFavourite: removeFav,
  };
}
