import type { AggregateResult, SessionTreeNode } from "./quota-stats.js";
type QuotaStatsReportKind = "standard" | "session" | "session_tree";
type QuotaStatsReportTableOptions = {
    compactHeaders?: boolean;
    modelNameMaxWidth?: number;
};
export declare function formatQuotaStatsReport(params: {
    title: string;
    result: AggregateResult;
    topModels?: number;
    topSessions?: number;
    focusSessionID?: string;
    /** When true, hides Window/Sessions columns and Top Sessions section (for session-only reports) */
    sessionOnly?: boolean;
    reportKind?: QuotaStatsReportKind;
    sessionTree?: {
        rootSessionID: string;
        nodes: SessionTreeNode[];
    };
    generatedAtMs?: number;
    tableOptions?: QuotaStatsReportTableOptions;
}): string;
export {};
//# sourceMappingURL=quota-stats-format.d.ts.map