/**
 * Keyed cache and throttling system for rendered quota toasts.
 *
 * This is presentation-only throttling:
 * - Each cache key stores the last rendered toast string for that surface/session context
 * - Only fetch if minIntervalMs has passed since the last fetch for that key
 * - Deduplicate concurrent fetches per key
 */
const cacheEntries = new Map();
function getCacheEntry(cacheKey) {
    const existing = cacheEntries.get(cacheKey);
    if (existing) {
        return existing;
    }
    const created = {
        cachedToast: null,
        inFlightPromise: null,
        lastFetchTime: 0,
    };
    cacheEntries.set(cacheKey, created);
    return created;
}
/**
 * Get the cached toast message for a key if still valid.
 */
export function getCachedToast(cacheKey, minIntervalMs) {
    const cacheEntry = cacheEntries.get(cacheKey);
    if (!cacheEntry?.cachedToast) {
        return null;
    }
    const now = Date.now();
    const age = now - cacheEntry.cachedToast.timestamp;
    if (age < minIntervalMs) {
        return cacheEntry.cachedToast.message;
    }
    return null;
}
/**
 * Check if a new fetch should be initiated for a key.
 */
export function shouldFetch(cacheKey, minIntervalMs) {
    const cacheEntry = getCacheEntry(cacheKey);
    const now = Date.now();
    return now - cacheEntry.lastFetchTime >= minIntervalMs;
}
/**
 * Get or start a fetch operation with keyed deduplication.
 */
export async function getOrFetch(cacheKey, fetchFn, minIntervalMs) {
    const wrapped = async () => {
        const message = await fetchFn();
        return { message, cache: true };
    };
    return getOrFetchWithCacheControl(cacheKey, wrapped, minIntervalMs);
}
/**
 * Get or start a fetch operation with keyed deduplication and cache control.
 *
 * This is useful when some results should be displayed but not cached
 * (e.g. transient "all providers failed" cases).
 */
export async function getOrFetchWithCacheControl(cacheKey, fetchFn, minIntervalMs) {
    const cacheEntry = getCacheEntry(cacheKey);
    const cached = getCachedToast(cacheKey, minIntervalMs);
    if (cached !== null) {
        return cached;
    }
    if (cacheEntry.inFlightPromise) {
        return cacheEntry.inFlightPromise;
    }
    if (!shouldFetch(cacheKey, minIntervalMs)) {
        return cacheEntry.cachedToast?.message ?? null;
    }
    cacheEntry.lastFetchTime = Date.now();
    cacheEntry.inFlightPromise = (async () => {
        try {
            const out = await fetchFn();
            const result = out.message;
            const cache = out.cache ?? true;
            if (result === null) {
                cacheEntry.lastFetchTime = 0;
                return null;
            }
            if (!cache) {
                cacheEntry.lastFetchTime = 0;
                return result;
            }
            cacheEntry.cachedToast = {
                message: result,
                timestamp: Date.now(),
            };
            return result;
        }
        finally {
            cacheEntry.inFlightPromise = null;
            if (!cacheEntry.cachedToast && cacheEntry.lastFetchTime === 0) {
                cacheEntries.delete(cacheKey);
            }
        }
    })();
    return cacheEntry.inFlightPromise;
}
/**
 * Clear one keyed entry, or the whole keyed cache if no key is provided.
 */
export function clearCache(cacheKey) {
    if (cacheKey) {
        cacheEntries.delete(cacheKey);
        return;
    }
    cacheEntries.clear();
}
/**
 * Force update a keyed cache entry with a new message.
 */
export function updateCache(cacheKey, message) {
    const cacheEntry = getCacheEntry(cacheKey);
    cacheEntry.cachedToast = {
        message,
        timestamp: Date.now(),
    };
    cacheEntry.lastFetchTime = Date.now();
}
//# sourceMappingURL=cache.js.map