type Align = "left" | "right" | "center";
/**
 * Width measurement mode:
 * - "raw": Use string length (grapheme count)
 * - "markdown-conceal": Strip markdown syntax for width calculation (for TUI concealment mode)
 */
export type WidthMode = "raw" | "markdown-conceal";
export declare function renderMarkdownTable(params: {
    headers: string[];
    rows: string[][];
    aligns?: Align[];
    widthMode?: WidthMode;
}): string;
export {};
//# sourceMappingURL=markdown-table.d.ts.map