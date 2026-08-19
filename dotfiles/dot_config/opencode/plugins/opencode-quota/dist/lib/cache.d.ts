/**
 * Keyed cache and throttling system for rendered quota toasts.
 *
 * This is presentation-only throttling:
 * - Each cache key stores the last rendered toast string for that surface/session context
 * - Only fetch if minIntervalMs has passed since the last fetch for that key
 * - Deduplicate concurrent fetches per key
 */
/**
 * Get the cached toast message for a key if still valid.
 */
export declare function getCachedToast(cacheKey: string, minIntervalMs: number): string | null;
/**
 * Check if a new fetch should be initiated for a key.
 */
export declare function shouldFetch(cacheKey: string, minIntervalMs: number): boolean;
/**
 * Get or start a fetch operation with keyed deduplication.
 */
export declare function getOrFetch(cacheKey: string, fetchFn: () => Promise<string | null>, minIntervalMs: number): Promise<string | null>;
/**
 * Get or start a fetch operation with keyed deduplication and cache control.
 *
 * This is useful when some results should be displayed but not cached
 * (e.g. transient "all providers failed" cases).
 */
export declare function getOrFetchWithCacheControl(cacheKey: string, fetchFn: () => Promise<{
    message: string | null;
    cache?: boolean;
}>, minIntervalMs: number): Promise<string | null>;
/**
 * Clear one keyed entry, or the whole keyed cache if no key is provided.
 */
export declare function clearCache(cacheKey?: string): void;
/**
 * Force update a keyed cache entry with a new message.
 */
export declare function updateCache(cacheKey: string, message: string): void;
//# sourceMappingURL=cache.d.ts.map