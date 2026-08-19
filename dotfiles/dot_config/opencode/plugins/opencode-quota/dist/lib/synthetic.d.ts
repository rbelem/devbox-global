/**
 * Synthetic quota fetcher
 *
 * Resolves API key from multiple sources and queries:
 * https://api.synthetic.new/v2/quotas
 */
import type { SyntheticResult } from "./types.js";
export { getSyntheticKeyDiagnostics, hasSyntheticApiKey as hasSyntheticApiKeyConfigured, type SyntheticKeySource, } from "./synthetic-config.js";
export declare function querySyntheticQuota(options?: {
    requestTimeoutMs?: number;
}): Promise<SyntheticResult>;
//# sourceMappingURL=synthetic.d.ts.map