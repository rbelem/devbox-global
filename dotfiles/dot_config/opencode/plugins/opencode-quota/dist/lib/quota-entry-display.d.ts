import type { QuotaToastEntry } from "./entries.js";
export declare function normalizeSingleWindowLabelText(value?: string): string;
export type QuotaWindowKind = "rpm" | "five_hour" | "hour" | "week" | "day" | "month" | "year" | "mcp" | "code_review";
export declare function classifyQuotaWindowText(text: string): QuotaWindowKind | null;
export declare function extractSingleWindowWindowLabel(text: string): string | null;
export declare function buildSingleWindowPercentEntryDisplayName(entry: QuotaToastEntry): string;
//# sourceMappingURL=quota-entry-display.d.ts.map