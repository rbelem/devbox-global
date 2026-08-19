import { type QuotaProviderResult } from "./entries.js";
import type { QuotaResetWindow } from "./types.js";
export type QuotaResetProviderResult = {
    providerId: string;
    result: QuotaProviderResult;
};
export type QuotaResetNotice = {
    providerId: string;
    label: string;
    window: QuotaResetWindow;
    percentRemaining: number;
};
export declare function observeQuotaResetNotifications(params: {
    providers: QuotaResetProviderResult[];
    windows: readonly QuotaResetWindow[];
    nowMs?: number;
    statePath?: string;
}): Promise<QuotaResetNotice[]>;
export declare function formatQuotaResetNotification(notices: readonly QuotaResetNotice[]): string | null;
//# sourceMappingURL=quota-reset-notifications.d.ts.map