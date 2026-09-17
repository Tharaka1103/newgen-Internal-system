/**
 * Lightweight, high-performance in-memory cache for server-side aggregations and heavy queries.
 * Ideal for reducing MongoDB roundtrips on cloud hosting (Vercel, Railway, Render, etc.)
 * especially on low-bandwidth / high-latency connections.
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

// Global cache to survive hot reloads in development and maintain across requests in server processes
declare global {
  // eslint-disable-next-line no-var
  var __memCacheStore: Map<string, CacheEntry<any>> | undefined;
}

const store: Map<string, CacheEntry<any>> = global.__memCacheStore || new Map();
if (process.env.NODE_ENV !== 'production') {
  global.__memCacheStore = store;
}

/**
 * Retrieves a cached value or executes the fetcher function and caches the result.
 * 
 * @param key Unique cache identifier (e.g. 'admin_dashboard_metrics')
 * @param ttlSeconds Time-to-live in seconds (e.g. 30 seconds)
 * @param fetcher Async function that queries the database
 */
export async function getCachedOrFetch<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const now = Date.now();
  const existing = store.get(key);

  if (existing && existing.expiresAt > now) {
    return existing.data as T;
  }

  const freshData = await fetcher();
  store.set(key, {
    data: freshData,
    expiresAt: now + ttlSeconds * 1000,
  });

  return freshData;
}

/**
 * Invalidates specific cache keys or all keys matching a prefix/regex
 */
export function invalidateCache(keyOrPattern?: string | RegExp): void {
  if (!keyOrPattern) {
    store.clear();
    return;
  }

  if (typeof keyOrPattern === 'string') {
    store.delete(keyOrPattern);
    return;
  }

  for (const key of store.keys()) {
    if (keyOrPattern.test(key)) {
      store.delete(key);
    }
  }
}
