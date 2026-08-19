/**
 * NanoGPT live quota and balance fetcher.
 *
 * Queries:
 * - https://nano-gpt.com/api/subscription/v1/usage
 * - https://nano-gpt.com/api/check-balance
 */
import type { QuotaError } from "./types.js";
export type NanoGptEndpoint = "usage" | "balance";
export type NanoGptUsageWindow = {
    used: number;
    limit: number;
    remaining: number;
    percentRemaining: number;
    resetTimeIso?: string;
};
export interface NanoGptSubscription {
    active: boolean;
    state: string;
    enforceDailyLimit: boolean;
    daily?: NanoGptUsageWindow;
    monthly?: NanoGptUsageWindow;
    currentPeriodEndIso?: string;
    graceUntilIso?: string;
}
export interface NanoGptBalance {
    usdBalance?: number;
    usdBalanceRaw?: string;
    nanoBalanceRaw?: string;
}
export type NanoGptResult = {
    success: true;
    subscription?: NanoGptSubscription;
    balance?: NanoGptBalance;
    endpointErrors?: Array<{
        endpoint: NanoGptEndpoint;
        message: string;
    }>;
} | QuotaError | null;
export { getNanoGptKeyDiagnostics, hasNanoGptApiKey as hasNanoGptApiKeyConfigured, type NanoGptKeySource, } from "./nanogpt-config.js";
export declare function formatNanoGptBalanceValue(balance: {
    usdBalance?: number;
    nanoBalanceRaw?: string;
}): string | null;
export declare function queryNanoGptQuota(options?: {
    requestTimeoutMs?: number;
}): Promise<NanoGptResult>;
//# sourceMappingURL=nanogpt.d.ts.map