/**
 * OpenRouter key usage fetcher.
 *
 * Reuses the custom-provider OpenRouter mapping so built-in and custom
 * OpenRouter sources interpret the API response identically.
 */
import { type QuotaProviderAuthResolution, type RemoteQuotaProviderResult } from "./quota-providers-remote.js";
export declare function resolveOpenRouterApiKey(): Promise<QuotaProviderAuthResolution>;
export declare function hasOpenRouterApiKeyConfigured(): Promise<boolean>;
export declare function queryOpenRouterQuota(options?: {
    requestTimeoutMs?: number;
}): Promise<RemoteQuotaProviderResult | null>;
//# sourceMappingURL=openrouter.d.ts.map