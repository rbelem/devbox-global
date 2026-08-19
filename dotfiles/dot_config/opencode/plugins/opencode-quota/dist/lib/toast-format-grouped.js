/**
 * Grouped toast formatter.
 *
 * Renders quota entries grouped by provider/account with compact bars.
 * Designed to feel like a status dashboard while still respecting OpenCode toast width.
 */
import { isValueEntry } from "./entries.js";
import { bar, DISPLAYED_PERCENT_LABEL_WIDTH, formatDisplayedPercentLabel, formatResetCountdown, isResetTimeDecimals, padLeft, padRight, resolveDisplayedPercent, } from "./format-utils.js";
import { normalizeGroupedQuotaEntries } from "./grouped-entry-normalization.js";
import { formatGroupedHeader } from "./grouped-header-format.js";
import { classifyQuotaWindowText } from "./quota-entry-display.js";
import { renderSessionTokensLines } from "./session-tokens-format.js";
function normalizeLabelText(value) {
    return value?.trim().replace(/:+$/u, "").trim() ?? "";
}
const GROUPED_WINDOW_LABELS = {
    rpm: "RPM",
    five_hour: "Five-hour",
    hour: "Hourly",
    week: "Weekly",
    day: "Daily",
    month: "Monthly",
    year: "Yearly",
    mcp: "MCP",
    code_review: "Code Review",
};
function extractWindowLabel(text) {
    const kind = classifyQuotaWindowText(text);
    return kind ? GROUPED_WINDOW_LABELS[kind] : null;
}
function resolveGroupedRowLabel(entry) {
    const rawLabel = normalizeLabelText(entry.label);
    const fromLabel = extractWindowLabel(rawLabel);
    if (fromLabel)
        return fromLabel;
    if (rawLabel)
        return rawLabel;
    const metricLabel = normalizeLabelText(entry.metricLabel);
    const fromMetricLabel = extractWindowLabel(metricLabel);
    if (fromMetricLabel)
        return fromMetricLabel;
    if (metricLabel)
        return metricLabel;
    const fromName = extractWindowLabel(entry.name);
    if (fromName)
        return fromName;
    return normalizeLabelText(entry.group) || "Quota window";
}
export function formatQuotaRowsGrouped(params) {
    const layout = params.layout ?? { maxWidth: 50, narrowAt: 42, tinyAt: 32 };
    const maxWidth = layout.maxWidth;
    const isTiny = maxWidth <= layout.tinyAt;
    const isNarrow = !isTiny && maxWidth <= layout.narrowAt;
    const separator = "  ";
    const percentCol = Math.max(DISPLAYED_PERCENT_LABEL_WIDTH, ...(params.entries ?? [])
        .filter((entry) => !isValueEntry(entry))
        .map((entry) => formatDisplayedPercentLabel(entry.percentRemaining, params.percentDisplayMode).length));
    const barWidth = Math.max(10, maxWidth - separator.length - percentCol);
    const timeCol = isTiny ? 6 : isNarrow ? 7 : 7;
    const lines = [];
    // Group entries in stable order.
    const groupOrder = [];
    const groups = new Map();
    for (const entry of normalizeGroupedQuotaEntries(params.entries ?? [], "toast")) {
        const list = groups.get(entry.group);
        if (list)
            list.push(entry);
        else {
            groupOrder.push(entry.group);
            groups.set(entry.group, [entry]);
        }
    }
    for (let gi = 0; gi < groupOrder.length; gi++) {
        const g = groupOrder[gi];
        const list = groups.get(g) ?? [];
        if (gi > 0)
            lines.push("");
        lines.push(formatGroupedHeader(g).slice(0, maxWidth));
        for (const entry of list) {
            const right = entry.right ? entry.right.trim() : "";
            if (isValueEntry(entry)) {
                const label = entry.label?.trim() || entry.name;
                const timeStr = formatResetCountdown(entry.resetTimeIso, {
                    compactRounded: true,
                    decimals: params.resetTimeDecimals,
                });
                const value = entry.value.trim();
                if (isTiny) {
                    // Tiny: "label  time  value"
                    const timeWidth = isResetTimeDecimals(params.resetTimeDecimals)
                        ? Math.max(timeCol, timeStr.length)
                        : timeCol;
                    const valueCol = Math.min(value.length, Math.max(6, percentCol + 2));
                    const tinyNameCol = Math.max(1, maxWidth - separator.length - timeWidth - separator.length - valueCol);
                    const leftText = right ? `${label} ${right}` : label;
                    const line = [
                        padRight(leftText, tinyNameCol),
                        padLeft(timeStr, timeWidth),
                        padLeft(value, valueCol),
                    ].join(separator);
                    lines.push(line.slice(0, maxWidth));
                    continue;
                }
                // Non-tiny: single line (no bar)
                const timeWidth = Math.max(timeStr.length, timeCol);
                const valueWidth = Math.max(value.length, 6);
                const leftMax = Math.max(1, barWidth - separator.length - valueWidth - separator.length - timeWidth);
                const leftText = right ? `${label} ${right}` : label;
                lines.push((padRight(leftText, leftMax) +
                    separator +
                    padLeft(value, valueWidth) +
                    separator +
                    padLeft(timeStr, timeWidth)).slice(0, maxWidth));
                continue;
            }
            const label = resolveGroupedRowLabel(entry);
            // Percent entries
            // Show reset countdown whenever quota is not fully available.
            // (i.e., any usage at all, or depleted)
            const timeStr = entry.percentRemaining < 100
                ? formatResetCountdown(entry.resetTimeIso, {
                    compactRounded: true,
                    decimals: params.resetTimeDecimals,
                })
                : "";
            const displayedPercent = resolveDisplayedPercent(entry.percentRemaining, params.percentDisplayMode);
            const percentLabel = formatDisplayedPercentLabel(entry.percentRemaining, params.percentDisplayMode);
            if (isTiny) {
                // Tiny: "label  time  XX%" (ignore bar)
                const timeWidth = isResetTimeDecimals(params.resetTimeDecimals)
                    ? Math.max(timeCol, timeStr.length)
                    : timeCol;
                const tinyNameCol = Math.max(1, maxWidth - separator.length - timeWidth - separator.length - percentCol);
                const line = [
                    padRight(label, tinyNameCol),
                    padLeft(timeStr, timeWidth),
                    padLeft(percentLabel, percentCol),
                ].join(separator);
                lines.push(line.slice(0, maxWidth));
                continue;
            }
            // Line 1: label + optional right + time at end
            const timeWidth = Math.max(timeStr.length, timeCol);
            const leftMax = Math.max(1, maxWidth - separator.length - timeWidth);
            lines.push((padRight(label, leftMax) + separator + padLeft(timeStr, timeWidth)).slice(0, maxWidth));
            // Line 2: bar + percent
            const barCell = bar(displayedPercent, barWidth);
            const percentCell = padLeft(percentLabel, percentCol);
            lines.push([barCell, percentCell].join(separator));
        }
    }
    for (const err of params.errors ?? []) {
        if (lines.length > 0)
            lines.push("");
        lines.push(`${err.label}: ${err.message}`);
    }
    // Add session token summary (if data available and non-empty)
    const tokenLines = renderSessionTokensLines(params.sessionTokens, { maxWidth });
    if (tokenLines.length > 0) {
        if (lines.length > 0)
            lines.push("");
        lines.push(...tokenLines);
    }
    return lines.join("\n");
}
//# sourceMappingURL=toast-format-grouped.js.map