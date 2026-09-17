'use client';

/**
 * Client-Side Instant Stale-While-Revalidate (SWR) cache helper.
 * Provides instant page switching without loading flickers or blank states,
 * especially resilient on slow mobile networks (3G/4G with weak signal).
 */

interface CacheItem<T> {
  data: T;
  timestamp: number;
}

const clientCache = new Map<string, CacheItem<any>>();

interface CachedFetchOptions {
  /** How long data is considered fresh before revalidating (in ms). Default: 30,000ms (30s) */
  maxAgeMs?: number;
  /** Force network fetch bypassing cache */
  bypassCache?: boolean;
}

/**
 * Fetch with instant cache return and background revalidation
 */
export async function cachedFetch<T = any>(
  url: string,
  init?: RequestInit,
  options: CachedFetchOptions = {}
): Promise<{ data: T; isStale: boolean }> {
  // Only cache GET requests without custom non-GET methods
  const isGet = !init || !init.method || init.method.toUpperCase() === 'GET';
  if (!isGet || options.bypassCache) {
    const res = await fetch(url, init);
    const data = await res.json();
    return { data, isStale: false };
  }

  const maxAge = options.maxAgeMs ?? 30000;
  const now = Date.now();
  const cached = clientCache.get(url);

  if (cached && now - cached.timestamp < maxAge) {
    // Return cached immediately!
    return { data: cached.data as T, isStale: false };
  }

  if (cached) {
    // Data is stale: initiate background fetch and return stale data immediately so UI doesn't stall!
    fetch(url, init)
      .then((r) => r.json())
      .then((fresh) => {
        clientCache.set(url, { data: fresh, timestamp: Date.now() });
      })
      .catch(() => {
        // network error; keep stale data in cache
      });

    return { data: cached.data as T, isStale: true };
  }

  // First time: fetch from network and cache
  const res = await fetch(url, init);
  const freshData = await res.json();
  clientCache.set(url, { data: freshData, timestamp: now });
  return { data: freshData, isStale: false };
}

/**
 * Invalidate client-side cache entries when mutations (POST, PATCH, DELETE) occur
 */
export function invalidateClientCache(urlPrefix?: string): void {
  if (!urlPrefix) {
    clientCache.clear();
    return;
  }

  for (const key of clientCache.keys()) {
    if (key.startsWith(urlPrefix) || key.includes(urlPrefix)) {
      clientCache.delete(key);
    }
  }
}
