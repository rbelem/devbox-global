/**
 * Kilo Gateway API client.
 *
 * Reports Kilo Pass credit totals and usage from the authenticated tRPC
 * subscription-state endpoint, with a balance-only fallback for accounts
 * without an active Kilo Pass.
 */
import type { QuotaError } from "./types.js";
type KiloPassStateSuccess = {
    success: true;
    baseCreditsUsd: number;
    usageUsd: number;
    bonusCreditsUsd: number;
    remainingUsd: number;
    overageUsd: number;
    resetTimeIso?: string;
};
export type KiloPassStateResult = KiloPassStateSuccess | QuotaError | null;
export type KiloQuotaResult = (KiloPassStateSuccess & {
    mode: "kilo_pass";
}) | {
    success: true;
    mode: "gateway_balance";
    balanceUsd: number;
} | QuotaError | null;
type KiloRequestOptions = {
    requestTimeoutMs?: number;
};
export declare function queryKiloPassState(options?: KiloRequestOptions): Promise<KiloPassStateResult>;
export declare function queryKiloQuota(options?: KiloRequestOptions): Promise<KiloQuotaResult>;
export {};
//# sourceMappingURL=kilo.d.ts.map