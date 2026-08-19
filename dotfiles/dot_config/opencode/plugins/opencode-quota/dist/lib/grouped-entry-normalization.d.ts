import type { QuotaToastEntry } from "./entries.js";
export type GroupedRenderTarget = "toast" | "quota";
export type NormalizedGroupedQuotaEntry = QuotaToastEntry & {
    group: string;
};
export type QuotaEntryGroup = {
    group: string;
    entries: NormalizedGroupedQuotaEntry[];
};
export declare function groupQuotaEntries(entries: QuotaToastEntry[], target: GroupedRenderTarget): QuotaEntryGroup[];
export declare function normalizeGroupedQuotaEntries(entries: QuotaToastEntry[], target: GroupedRenderTarget): NormalizedGroupedQuotaEntry[];
//# sourceMappingURL=grouped-entry-normalization.d.ts.map