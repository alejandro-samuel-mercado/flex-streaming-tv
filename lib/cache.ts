/**
 * Simple in-memory cache for the TV app.
 * 
 * Strategy: Stale-While-Revalidate
 *   - On first load: fetch normally (no cache), store result.
 *   - On subsequent visits: return cached data INSTANTLY, then refresh in background.
 *   - Cache expires after TTL_MS (5 minutes by default).
 * 
 * This eliminates the loading skeleton on every page switch.
 */

interface CacheEntry<T> {
    data: T;
    timestamp: number;
}

const TTL_MS = 1 * 60 * 60 * 1000; // 1 hour

const store = new Map<string, CacheEntry<any>>();

export const cache = {
    /**
     * Get cached data if still fresh. Returns null if missing or expired.
     */
    get<T>(key: string): T | null {
        const entry = store.get(key);
        if (!entry) return null;
        if (Date.now() - entry.timestamp > TTL_MS) {
            store.delete(key);
            return null;
        }
        return entry.data as T;
    },

    /**
     * Store data in cache with current timestamp.
     */
    set<T>(key: string, data: T): void {
        store.set(key, { data, timestamp: Date.now() });
    },

    /**
     * Check if a key exists and is not expired.
     */
    has(key: string): boolean {
        return cache.get(key) !== null;
    },

    /**
     * Remove a specific key (e.g., after a mutation/refresh).
     */
    invalidate(key: string): void {
        store.delete(key);
    },

    /**
     * Invalidate all keys that start with a prefix.
     */
    invalidatePrefix(prefix: string): void {
        for (const key of store.keys()) {
            if (key.startsWith(prefix)) store.delete(key);
        }
    },

    /**
     * Clear everything.
     */
    clear(): void {
        store.clear();
    },
};

/**
 * useCachedFetch — a helper for screens.
 * 
 * Usage:
 *   const data = await cachedFetch('home-data', () => fetchApi(API_ROUTES.HOMEPAGE.DATA));
 * 
 * - If fresh cache exists: returns it immediately.
 * - Always revalidates in background after returning cached data.
 * - If no cache: fetches and waits normally.
 * 
 * @param key        Unique cache key for this data.
 * @param fetcher    Async function that returns fresh data.
 * @param onUpdate   Called when background revalidation completes with new data.
 */
export async function cachedFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    onUpdate?: (freshData: T) => void,
): Promise<T> {
    const cached = cache.get<T>(key);

    if (cached !== null) {
        // Return stale data immediately, revalidate in background
        if (onUpdate) {
            fetcher()
                .then((fresh) => {
                    cache.set(key, fresh);
                    onUpdate(fresh);
                })
                .catch(() => { }); // Silent background failure is fine
        }
        return cached;
    }

    // No cache — fetch and wait
    const fresh = await fetcher();
    cache.set(key, fresh);
    return fresh;
}
