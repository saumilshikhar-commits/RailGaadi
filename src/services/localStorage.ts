import type { RecentSearch, FavouriteTrain } from '../types';

const RECENT_KEY = 'railgaadi:recent';
const FAVOURITES_KEY = 'railgaadi:favourites';
const MAX_RECENT = 8;

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage errors
  }
}

// ─── Recent Searches ──────────────────────────────────────────────────────────

export function getRecentSearches(): RecentSearch[] {
  return readJSON<RecentSearch[]>(RECENT_KEY, []);
}

export function addRecentSearch(item: Omit<RecentSearch, 'searchedAt'>): void {
  const current = getRecentSearches().filter(r => r.trainId !== item.trainId);
  const next: RecentSearch[] = [
    { ...item, searchedAt: new Date().toISOString() },
    ...current,
  ].slice(0, MAX_RECENT);
  writeJSON(RECENT_KEY, next);
}

export function removeRecentSearch(trainId: string): void {
  writeJSON(RECENT_KEY, getRecentSearches().filter(r => r.trainId !== trainId));
}

export function clearRecentSearches(): void {
  localStorage.removeItem(RECENT_KEY);
}

// ─── Favourites ───────────────────────────────────────────────────────────────

export function getFavourites(): FavouriteTrain[] {
  return readJSON<FavouriteTrain[]>(FAVOURITES_KEY, []);
}

export function isFavourite(trainId: string): boolean {
  return getFavourites().some(f => f.trainId === trainId);
}

export function addFavourite(item: Omit<FavouriteTrain, 'savedAt'>): void {
  const current = getFavourites().filter(f => f.trainId !== item.trainId);
  writeJSON(FAVOURITES_KEY, [{ ...item, savedAt: new Date().toISOString() }, ...current]);
}

export function removeFavourite(trainId: string): void {
  writeJSON(FAVOURITES_KEY, getFavourites().filter(f => f.trainId !== trainId));
}

export function toggleFavourite(item: Omit<FavouriteTrain, 'savedAt'>): boolean {
  if (isFavourite(item.trainId)) {
    removeFavourite(item.trainId);
    return false;
  } else {
    addFavourite(item);
    return true;
  }
}
