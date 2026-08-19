/**
 * Shared "Session input/output tokens" rendering block.
 *
 * Extracted from format.ts, toast-format-grouped.ts, and
 * quota-command-format.ts to eliminate verbatim duplication.
 */
import { formatTokenCount, padLeft, padRight, shortenModelName } from "./format-utils.js";
export const WIDE_SESSION_TOKEN_LINE_WIDTH = 45;
export const SESSION_TOKEN_SECTION_HEADING = "Session input/output tokens";
function normalizeMaxWidth(maxWidth) {
    if (typeof maxWidth !== "number" || !Number.isFinite(maxWidth))
        return undefined;
    return Math.max(1, Math.trunc(maxWidth));
}
function clampRenderedLine(line, maxWidth) {
    const width = normalizeMaxWidth(maxWidth);
    return width === undefined ? line : line.slice(0, width);
}
function formatInputWithCache(input, cachedInput) {
    const inputStr = formatTokenCount(input);
    const cached = cachedInput ?? 0;
    return cached > 0 ? `${inputStr} (${formatTokenCount(cached)})` : inputStr;
}
function formatInputCell(input, cachedInput) {
    const value = formatInputWithCache(input, cachedInput);
    return value.length > 6 ? value : padLeft(value, 6);
}
function buildWideSessionTokenSectionModel(sessionTokens) {
    const lines = [];
    for (const model of sessionTokens.models) {
        const shortName = shortenModelName(model.modelID, 20);
        const inStr = formatInputCell(model.input, model.cachedInput);
        const outStr = formatTokenCount(model.output);
        lines.push(`  ${padRight(shortName, 20)}  ${inStr} in  ${padLeft(outStr, 6)} out`);
    }
    return {
        heading: SESSION_TOKEN_SECTION_HEADING,
        lines,
    };
}
function buildCompactSessionTokenSectionModel(sessionTokens, maxWidth) {
    const width = Math.max(1, Math.trunc(maxWidth));
    const lines = [];
    for (const model of sessionTokens.models) {
        const modelIndent = width > 2 ? "  " : "";
        const modelLineWidth = Math.max(1, width - modelIndent.length);
        const detailIndent = width > 4 ? "    " : width > 2 ? "  " : "";
        const inStr = formatInputWithCache(model.input, model.cachedInput);
        const outStr = formatTokenCount(model.output);
        const compactCounts = `${inStr} in  ${outStr} out`;
        lines.push(`${modelIndent}${shortenModelName(model.modelID, modelLineWidth)}`.slice(0, width));
        if (detailIndent.length + compactCounts.length <= width) {
            lines.push(`${detailIndent}${compactCounts}`.slice(0, width));
            continue;
        }
        lines.push(`${detailIndent}${inStr} in`.slice(0, width));
        lines.push(`${detailIndent}${outStr} out`.slice(0, width));
    }
    return {
        heading: SESSION_TOKEN_SECTION_HEADING.slice(0, width),
        lines,
    };
}
function buildSidebarSessionTokenSummaryModel(sessionTokens, options) {
    const totalCached = sessionTokens.totalCachedInput ?? 0;
    const summaryLine = `  ${formatInputWithCache(sessionTokens.totalInput, totalCached)} in  ${formatTokenCount(sessionTokens.totalOutput)} out`;
    return {
        heading: clampRenderedLine(SESSION_TOKEN_SECTION_HEADING, options?.maxWidth),
        lines: [clampRenderedLine(summaryLine, options?.maxWidth)],
    };
}
export function buildSessionTokenSectionModel(sessionTokens, options) {
    if (!sessionTokens || sessionTokens.models.length === 0)
        return null;
    if (options?.variant === "sidebar_summary") {
        return buildSidebarSessionTokenSummaryModel(sessionTokens, options);
    }
    const maxWidth = normalizeMaxWidth(options?.maxWidth);
    if (maxWidth !== undefined && maxWidth < WIDE_SESSION_TOKEN_LINE_WIDTH) {
        return buildCompactSessionTokenSectionModel(sessionTokens, maxWidth);
    }
    const wideSection = buildWideSessionTokenSectionModel(sessionTokens);
    if (maxWidth !== undefined && wideSection.lines.some((line) => line.length > maxWidth)) {
        return buildCompactSessionTokenSectionModel(sessionTokens, maxWidth);
    }
    return wideSection;
}
/**
 * Render the shared session input/output token section lines.
 *
 * Returns an empty array when there is no data to display.
 * Callers are responsible for inserting a leading blank line if needed.
 */
export function renderSessionTokensLines(sessionTokens, options) {
    const section = buildSessionTokenSectionModel(sessionTokens, options);
    return section ? [section.heading, ...section.lines] : [];
}
/**
 * Render the sidebar-only aggregate session token summary lines.
 *
 * The TUI sidebar keeps the heading but switches to a single total summary line
 * so the fixed-width panel stays compact without dropping grouped/classic quota rows.
 */
export function renderSidebarSessionTokenSummaryLines(sessionTokens, options) {
    const section = buildSessionTokenSectionModel(sessionTokens, {
        maxWidth: options?.maxWidth,
        variant: "sidebar_summary",
    });
    return section ? [section.heading, ...section.lines] : [];
}
//# sourceMappingURL=session-tokens-format.js.map