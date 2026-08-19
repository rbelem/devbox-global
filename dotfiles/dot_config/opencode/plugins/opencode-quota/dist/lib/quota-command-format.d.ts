/**
 * Verbose quota status formatter for /quota.
 *
 * This is intentionally more verbose than the toast:
 * - Always shows reset countdown when available
 * - Uses one line per limit, grouped under provider headers
 * - Includes session token summary (input/output per model)
 */
import type { QuotaToastEntry, QuotaToastError, SessionTokensData } from "./entries.js";
import type { PercentDisplayMode } from "./types.js";
export declare const QUOTA_COMMAND_BAR_WIDTH = 10;
export declare const QUOTA_COMMAND_LABEL_WIDTH = 12;
export declare function formatQuotaCommand(params: {
    entries: QuotaToastEntry[];
    errors: QuotaToastError[];
    sessionTokens?: SessionTokensData;
    generatedAtMs?: number;
    percentDisplayMode?: PercentDisplayMode;
}): string;
//# sourceMappingURL=quota-command-format.d.ts.map