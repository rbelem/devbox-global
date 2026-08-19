import { type WidthMode } from "./markdown-table.js";
export type ReportHeading = {
    title: string;
    generatedAtMs?: number;
};
export type ReportKvRow = {
    key: string;
    value?: string;
    indent?: 0 | 1;
    trailingColon?: boolean;
};
export type ReportBlock = {
    kind: "lines";
    lines: string[];
} | {
    kind: "kv";
    rows: ReportKvRow[];
} | {
    kind: "table";
    headers: string[];
    rows: string[][];
    aligns: Array<"left" | "right">;
    widthMode?: WidthMode;
};
export type ReportSection = {
    id: string;
    title?: string;
    blocks: ReportBlock[];
};
export type ReportDocument = {
    heading?: ReportHeading;
    sections: ReportSection[];
};
export declare function renderPlainTextReport(document: ReportDocument): string;
export declare function renderMarkdownReport(document: ReportDocument): string;
//# sourceMappingURL=report-document.d.ts.map