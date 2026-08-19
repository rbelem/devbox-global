import { sanitizeQuotaRenderData, sanitizeSingleLineDisplayText } from "./display-sanitize.js";
import { isValueEntry } from "./entries.js";
import { formatDisplayedPercentLabel } from "./format-utils.js";
import { formatGroupedHeader } from "./grouped-header-format.js";
import { extractSingleWindowWindowLabel } from "./quota-entry-display.js";
const COMPACT_SEGMENT_SEPARATOR = " | ";
const COMPACT_WINDOW_SEPARATOR = ", ";
const ELLIPSIS = "…";
function normalizeMaxWidth(maxWidth) {
    if (!Number.isFinite(maxWidth))
        return 96;
    return Math.max(0, Math.trunc(maxWidth));
}
function compactText(text) {
    return sanitizeSingleLineDisplayText(text);
}
function truncateSingleLine(text, maxWidth) {
    const width = normalizeMaxWidth(maxWidth);
    if (width === 0)
        return "";
    const singleLine = compactText(text);
    if (singleLine.length <= width)
        return singleLine;
    if (width === 1)
        return ELLIPSIS;
    return `${singleLine.slice(0, width - ELLIPSIS.length).trimEnd()}${ELLIPSIS}`;
}
function formatCompactPercentLabel(percentRemaining, mode) {
    return formatDisplayedPercentLabel(percentRemaining, mode).split(" ")[0] ?? "0%";
}
function formatCompactDisplayName(name) {
    return compactText(name.replace(/^\[([^\]]+)\](.*)$/u, "$1$2"));
}
function formatCompactProviderLabel(name) {
    const compactName = formatCompactDisplayName(name);
    const withoutParentheticalPunctuation = compactName.replace(/\(([^)]*)\)/gu, (_match, inner) => {
        const normalized = inner.trim();
        if (!normalized)
            return "";
        if (/^personal$/iu.test(normalized))
            return "";
        if (/^pro$/iu.test(normalized))
            return " Pro";
        return ` (${normalized})`;
    });
    return compactText(withoutParentheticalPunctuation)
        .replace(/\s{2,}/gu, " ")
        .trim();
}
function formatWindowLabel(label) {
    const compactLabel = compactText(label.replace(/:+$/u, "").trim());
    return compactLabel.toLowerCase() === "weekly" ? "7d" : compactLabel;
}
function getBracketedProviderName(name) {
    const match = /^\[([^\]]+)\]/u.exec(name.trim());
    return match?.[1]?.trim() || null;
}
function getProviderName(entry) {
    const bracketedProvider = getBracketedProviderName(entry.name);
    if (bracketedProvider)
        return formatCompactProviderLabel(bracketedProvider);
    if (entry.group?.trim()) {
        return formatCompactProviderLabel(formatGroupedHeader(entry.group));
    }
    return formatCompactProviderLabel(entry.name);
}
function getWindowLabel(entry) {
    const windowLabel = extractSingleWindowWindowLabel(entry.label ?? "") ?? extractSingleWindowWindowLabel(entry.name);
    if (windowLabel)
        return { text: formatWindowLabel(windowLabel), isWindow: true };
    const explicitLabel = entry.label?.trim().replace(/:+$/u, "").trim();
    return explicitLabel ? { text: compactText(explicitLabel), isWindow: false } : null;
}
function formatCompactValueEntrySegment(entry) {
    const name = getProviderName(entry);
    const value = compactText(entry.value);
    const segment = [name, value].filter(Boolean).join(" - ");
    return segment || null;
}
function formatCompactPercentGroupSegment(group) {
    const windows = group.windows;
    if (windows.length === 0)
        return null;
    const summary = windows.length === 1
        ? windows[0].label && !windows[0].isWindow
            ? `${windows[0].label} ${windows[0].percent}`
            : windows[0].percent
        : windows
            .map((window) => (window.label ? `${window.label} ${window.percent}` : window.percent))
            .join(COMPACT_WINDOW_SEPARATOR);
    const separator = windows.every((window) => window.label && !window.isWindow) ? ": " : " ";
    return compactText(`${group.provider}${separator}${summary}`);
}
function formatCompactEntrySegments(params) {
    const groups = new Map();
    const pendingSegments = [];
    for (const entry of params.entries) {
        if (isValueEntry(entry)) {
            const segment = formatCompactValueEntrySegment(entry);
            if (segment)
                pendingSegments.push({ kind: "value", segment });
            continue;
        }
        const provider = getProviderName(entry);
        const percent = formatCompactPercentLabel(entry.percentRemaining, params.percentDisplayMode);
        const label = getWindowLabel(entry);
        const key = provider.toLowerCase();
        let group = groups.get(key);
        if (!group) {
            group = { provider, windows: [] };
            groups.set(key, group);
            pendingSegments.push({ kind: "percent", key });
        }
        group.windows.push({
            label: label?.text ?? null,
            percent,
            isWindow: label?.isWindow ?? false,
        });
    }
    return pendingSegments
        .map((pending) => pending.kind === "value"
        ? pending.segment
        : formatCompactPercentGroupSegment(groups.get(pending.key)))
        .filter((segment) => Boolean(segment));
}
function formatCompactTokenCount(count) {
    if (!Number.isFinite(count))
        return "0";
    if (Math.abs(count) >= 1_000_000) {
        return `${(count / 1_000_000).toFixed(1).replace(/\.0$/u, "")}M`;
    }
    if (Math.abs(count) >= 1_000) {
        return `${(count / 1_000).toFixed(1).replace(/\.0$/u, "")}K`;
    }
    return String(Math.trunc(count));
}
function formatCompactSessionTokensSegment(data) {
    const sessionTokens = data.sessionTokens;
    if (!sessionTokens)
        return null;
    const hasTokenData = sessionTokens.models.length > 0 ||
        sessionTokens.totalInput > 0 ||
        (sessionTokens.totalCachedInput ?? 0) > 0 ||
        sessionTokens.totalOutput > 0;
    if (!hasTokenData)
        return null;
    const totalCached = sessionTokens.totalCachedInput ?? 0;
    const inputSegment = totalCached > 0
        ? `${formatCompactTokenCount(sessionTokens.totalInput)} (${formatCompactTokenCount(totalCached)})`
        : formatCompactTokenCount(sessionTokens.totalInput);
    return compactText(`tok ${inputSegment} in / ${formatCompactTokenCount(sessionTokens.totalOutput)} out`);
}
function formatIssueCount(count) {
    return `+${count} issue${count === 1 ? "" : "s"}`;
}
function formatFirstErrorSegment(errors) {
    const first = errors[0];
    if (!first)
        return null;
    const firstError = compactText(`${first.label}: ${first.message}`);
    if (errors.length === 1)
        return firstError;
    return compactText(`${firstError} +${errors.length - 1}`);
}
export function buildCompactQuotaStatusLine(params) {
    const maxWidth = normalizeMaxWidth(params.maxWidth);
    if (maxWidth === 0)
        return "";
    const data = sanitizeQuotaRenderData(params.data);
    const percentDisplayMode = params.percentDisplayMode ?? "remaining";
    const segments = formatCompactEntrySegments({ entries: data.entries, percentDisplayMode });
    const issues = data.errors.filter((error) => error.kind !== "intentional-filter");
    const sessionTokensSegment = formatCompactSessionTokensSegment(data);
    if (sessionTokensSegment) {
        segments.push(sessionTokensSegment);
    }
    if (issues.length > 0) {
        if (segments.length === 0) {
            const errorSegment = formatFirstErrorSegment(issues);
            if (errorSegment)
                segments.push(errorSegment);
        }
        else {
            const issueSegment = formatIssueCount(issues.length);
            const candidate = [...segments, issueSegment].join(COMPACT_SEGMENT_SEPARATOR);
            if (compactText(candidate).length <= maxWidth) {
                segments.push(issueSegment);
            }
        }
    }
    return truncateSingleLine(segments.join(COMPACT_SEGMENT_SEPARATOR), maxWidth);
}
//# sourceMappingURL=tui-compact-format.js.map