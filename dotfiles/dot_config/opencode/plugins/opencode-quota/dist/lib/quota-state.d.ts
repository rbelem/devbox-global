import type { QuotaProvider, QuotaProviderContext, QuotaProviderResult } from "./entries.js";
import type { QuotaProviderDefinition } from "./quota-providers.js";
declare const QUOTA_PROVIDER_CACHE_VERSION: 2;
export type PersistedQuotaProviderCacheEntry = {
    version: typeof QUOTA_PROVIDER_CACHE_VERSION;
    packageVersion: string;
    key: string;
    providerId: string;
    timestamp: number;
    result: QuotaProviderResult;
};
export declare function cloneQuotaProviderResult(result: QuotaProviderResult): QuotaProviderResult;
export declare function buildQuotaProviderStateCacheKey(providerId: string, ctx: QuotaProviderContext, options?: {
    runtimeEligibleQuotaProviders?: readonly QuotaProviderDefinition[];
}): string;
export declare function getQuotaProviderStateCacheFilePath(providerId: string, key: string): string;
export declare function fetchQuotaProviderResult(params: {
    provider: QuotaProvider;
    ctx: QuotaProviderContext;
    ttlMs: number;
    bypassCache?: boolean;
}): Promise<QuotaProviderResult>;
export type CachedProviderRead = {
    hit: true;
    result: QuotaProviderResult;
    timestamp: number;
} | {
    hit: false;
};
export declare function readCachedProviderResult(params: {
    provider: QuotaProvider;
    ctx: QuotaProviderContext;
    ttlMs: number;
}): Promise<CachedProviderRead>;
export declare function __resetQuotaStateForTests(): void;
export {};
//# sourceMappingURL=quota-state.d.ts.map