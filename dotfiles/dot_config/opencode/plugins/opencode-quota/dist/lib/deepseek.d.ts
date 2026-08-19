/**
 * DeepSeek balance fetcher.
 *
 * Queries: GET https://api.deepseek.com/user/balance
 * Auth: Bearer token in Authorization header.
 */
import type { QuotaError } from "./types.js";
export type DeepSeekCurrency = "CNY" | "USD";
export interface DeepSeekBalanceInfo {
    currency: DeepSeekCurrency;
    totalBalance: string;
    grantedBalance: string;
    toppedUpBalance: string;
}
export interface DeepSeekBalanceResult {
    isAvailable: boolean;
    balanceInfos: DeepSeekBalanceInfo[];
}
export type DeepSeekResult = {
    success: true;
    isAvailable: boolean;
    balanceInfos: DeepSeekBalanceInfo[];
} | QuotaError | null;
/**
 * Format a balance value with the appropriate currency symbol.
 */
export declare function formatDeepSeekBalanceValue(balance: {
    currency: DeepSeekCurrency;
    totalBalance: string;
}): string;
/**
 * Query DeepSeek balance from the API.
 *
 * @returns A typed result with success/error state, or null if no API key is configured.
 */
export declare function queryDeepSeekBalance(options?: {
    requestTimeoutMs?: number;
}): Promise<DeepSeekResult>;
export { type DeepSeekKeySource, getDeepSeekKeyDiagnostics, hasDeepSeekApiKey as hasDeepSeekApiKeyConfigured, } from "./deepseek-auth.js";
//# sourceMappingURL=deepseek.d.ts.map