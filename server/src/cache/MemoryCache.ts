/**
 * In-memory cache for local development.
 * In production, swap this for the Redis implementation.
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  createdAt: number;
}

const store = new Map<string, CacheEntry<unknown>>();

export class MemoryCache {
  async get<T>(key: string): Promise<{ data: T; cached: true } | null> {
    const entry = store.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      store.delete(key);
      return null;
    }
    return { data: entry.data, cached: true };
  }

  async set<T>(key: string, data: T, ttlSeconds: number): Promise<void> {
    store.set(key, {
      data,
      expiresAt: Date.now() + ttlSeconds * 1000,
      createdAt: Date.now(),
    });
  }

  async del(key: string): Promise<void> {
    store.delete(key);
  }

  async flush(): Promise<void> {
    store.clear();
  }
}

// Singleton
export const cache = new MemoryCache();
