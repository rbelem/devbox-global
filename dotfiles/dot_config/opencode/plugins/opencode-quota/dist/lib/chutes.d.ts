/**
 * Chutes AI quota fetcher
 *
 * Resolves API key from multiple sources and queries:
 * https://api.chutes.ai/users/me/quota_usage/me
 */
import type { ChutesResult } from "./types.js";
export { type ChutesKeySource, getChutesKeyDiagnostics, hasChutesApiKey as hasChutesApiKeyConfigured, } from "./chutes-config.js";
export declare function queryChutesQuota(options?: {
    requestTimeoutMs?: number;
}): Promise<ChutesResult>;
//# sourceMappingURL=chutes.d.ts.map