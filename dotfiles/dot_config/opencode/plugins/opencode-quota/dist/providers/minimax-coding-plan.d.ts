/**
 * MiniMax Coding Plan provider wrapper.
 *
 * Fetches quota data from MiniMax API for coding plan users.
 */
import type { QuotaProvider } from "../lib/entries.js";
import { type MiniMaxQuotaEndpointId } from "../lib/minimax-endpoints.js";
import type { MiniMaxResult } from "../lib/types.js";
/**
 * Fetch MiniMax coding plan quota from the API.
 *
 * Parses usage for MiniMax coding-plan models returned by the selected endpoint.
 *
 * @param apiKey - MiniMax API key
 * @returns Quota entries on success, error on failure, or empty entries when
 *          the API returns successfully but no models have reportable quota.
 */
export declare function queryMiniMaxQuota(apiKey: string, options?: {
    requestTimeoutMs?: number;
    endpoint?: MiniMaxQuotaEndpointId;
    label?: string;
}): Promise<MiniMaxResult>;
export declare const minimaxCodingPlanProvider: QuotaProvider;
export declare const minimaxChinaCodingPlanProvider: QuotaProvider;
//# sourceMappingURL=minimax-coding-plan.d.ts.map