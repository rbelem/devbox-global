/**
 * Grouped toast formatter.
 *
 * Renders quota entries grouped by provider/account with compact bars.
 * Designed to feel like a status dashboard while still respecting OpenCode toast width.
 */
import type { QuotaToastEntry, QuotaToastError, SessionTokensData } from "./entries.js";
import type { QuotaToastConfig } from "./types.js";
export declare function formatQuotaRowsGrouped(params: {
    layout?: {
        maxWidth: number;
        narrowAt: number;
        tinyAt: number;
    };
    entries?: QuotaToastEntry[];
    errors?: QuotaToastError[];
    percentDisplayMode?: QuotaToastConfig["percentDisplayMode"];
    resetTimeDecimals?: number;
    sessionTokens?: SessionTokensData;
}): string;
//# sourceMappingURL=toast-format-grouped.d.ts.map