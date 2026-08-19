/**
 * Verbose quota status formatter for /quota.
 *
 * This is intentionally more verbose than the toast:
 * - Always shows reset countdown when available
 * - Uses one line per limit, grouped under provider headers
 * - Includes session token summary (input/output per model)
 */
import { isValueEntry } from "./entries.js";
import { bar, formatDisplayedPercentLabel, formatLocalCallTimestamp, formatTokenCount, padLeft, padRight, resolveDisplayedPercent, } from "./format-utils.js";
import { groupQuotaEntries } from "./grouped-entry-normalization.js";
import { formatGroupedHeader } from "./grouped-header-format.js";
import { classifyQuotaWindowText } from "./quota-entry-display.js";
import { renderPlainTextReport, } from "./report-document.js";
import { SESSION_TOKEN_SECTION_HEADING } from "./session-tokens-format.js";
/**
 * Format reset time in compact form (different from toast countdown).
 * Uses seconds/minutes/hours/days format for /quota command.
 */
function formatResetTimeSeconds(diffSeconds) {
    if (!Number.isFinite(diffSeconds) || diffSeconds <= 0)
        return "now";
    if (diffSeconds < 60)
        return `${Math.ceil(diffSeconds)}s`;
    if (diffSeconds < 3600)
        return `${Math.ceil(diffSeconds / 60)}m`;
    if (diffSeconds < 86400)
        return `${Math.round(diffSeconds / 3600)}h`;
    return `${Math.round(diffSeconds / 86400)}d`;
}
function formatResetsIn(iso) {
    if (!iso)
        return "";
    const t = new Date(iso).getTime();
    if (!Number.isFinite(t))
        return "";
    const diffSeconds = (t - Date.now()) / 1000;
    return ` | resets in ${formatResetTimeSeconds(diffSeconds)}`;
}
export const QUOTA_COMMAND_BAR_WIDTH = 10;
export const QUOTA_COMMAND_LABEL_WIDTH = 12;
function normalizeMetricText(value) {
    return value?.trim().replace(/:+$/u, "").trim() ?? "";
}
const COMMAND_WINDOW_LABELS = {
    rpm: "RPM",
    five_hour: "5h",
    hour: "Hour",
    week: "Week",
    day: "Day",
    month: "Month",
    year: "Year",
};
function getCommandWindowLabel(entry) {
    const kind = classifyQuotaWindowText(normalizeMetricText(entry.label || entry.name));
    return kind ? (COMMAND_WINDOW_LABELS[kind] ?? null) : null;
}
function getCommandMetricLabel(entry) {
    const window = getCommandWindowLabel(entry);
    const resultType = entry.accounting?.resultType;
    if (resultType === "balance")
        return "Balance";
    if (resultType === "status")
        return "Status";
    const explicit = normalizeMetricText(entry.label);
    const metricLabel = normalizeMetricText(entry.metricLabel);
    const noun = resultType === "budget"
        ? "budget"
        : resultType === "usage"
            ? "usage"
            : resultType === "spend"
                ? "spend"
                : resultType === "quota" || resultType === "rate_limit"
                    ? "quota"
                    : "";
    if (noun) {
        return window ? `${window} ${noun}` : metricLabel || noun[0].toUpperCase() + noun.slice(1);
    }
    if (window)
        return `${window} quota`;
    return explicit || (isValueEntry(entry) ? "Value" : "Quota");
}
function formatCommandDetails(entry, rightWidth) {
    const right = entry.right?.trim();
    const reset = formatResetsIn(entry.resetTimeIso).replace(/^ \| resets in /u, "reset ");
    if (right && reset)
        return ` | ${padRight(right, rightWidth)} | ${reset}`;
    if (right)
        return ` | ${right}`;
    if (reset)
        return ` | ${reset}`;
    return "";
}
function buildQuotaCommandDocument(params) {
    const groups = groupQuotaEntries(params.entries, "quota");
    const sections = groups.map((group, index) => {
        const lines = [];
        const rightWidth = Math.max(0, ...group.entries.map((row) => row.right?.trim().length ?? 0));
        for (const row of group.entries) {
            const label = padRight(getCommandMetricLabel(row), QUOTA_COMMAND_LABEL_WIDTH);
            const details = formatCommandDetails(row, rightWidth);
            if (isValueEntry(row)) {
                lines.push(`  ${label}  ${row.value}${details}`);
                continue;
            }
            const pctLabel = formatDisplayedPercentLabel(row.percentRemaining, params.percentDisplayMode);
            const displayedPercent = resolveDisplayedPercent(row.percentRemaining, params.percentDisplayMode);
            lines.push(`  ${label}  ${bar(displayedPercent, QUOTA_COMMAND_BAR_WIDTH)}  ${padLeft(pctLabel, 9)}${details}`);
        }
        return {
            id: `group-${index}`,
            title: `→ ${formatGroupedHeader(group.group)}`,
            blocks: [{ kind: "lines", lines }],
        };
    });
    if (params.sessionTokens && params.sessionTokens.models.length > 0) {
        sections.push({
            id: "session-tokens",
            title: SESSION_TOKEN_SECTION_HEADING,
            blocks: [
                {
                    kind: "lines",
                    lines: params.sessionTokens.models.map((model) => {
                        const metrics = [`${formatTokenCount(model.input)} in`];
                        if ((model.cachedInput ?? 0) > 0) {
                            metrics.push(`${formatTokenCount(model.cachedInput ?? 0)} cached`);
                        }
                        metrics.push(`${formatTokenCount(model.output)} out`);
                        return `  ${model.modelID}: ${metrics.join(" | ")}`;
                    }),
                },
            ],
        });
    }
    if (params.errors.length > 0) {
        sections.push({
            id: "errors",
            title: "Partial failures",
            blocks: [
                {
                    kind: "lines",
                    lines: params.errors.map((err) => `  ${err.label}: ${err.message}`),
                },
            ],
        });
    }
    return {
        sections: [
            {
                id: "heading",
                blocks: [
                    {
                        kind: "lines",
                        lines: [`Quota (/quota) ${formatLocalCallTimestamp(params.generatedAtMs)}`],
                    },
                ],
            },
            ...sections,
        ],
    };
}
export function formatQuotaCommand(params) {
    return renderPlainTextReport(buildQuotaCommandDocument(params));
}
//# sourceMappingURL=quota-command-format.js.map