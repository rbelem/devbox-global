/**
 * Formatting helpers for quota toast output
 */
import type { QuotaToastEntry, QuotaToastError, SessionTokensData } from "./entries.js";
import type { QuotaFormatStyle } from "./quota-format-style.js";
import type { QuotaToastConfig } from "./types.js";
export declare function formatQuotaRows(params: {
    version: string;
    layout?: {
        maxWidth: number;
        narrowAt: number;
        tinyAt: number;
    };
    entries?: QuotaToastEntry[];
    errors?: QuotaToastError[];
    style?: QuotaFormatStyle;
    percentDisplayMode?: QuotaToastConfig["percentDisplayMode"];
    resetTimeDecimals?: number;
    sessionTokens?: SessionTokensData;
}): string;
//# sourceMappingURL=format.d.ts.map