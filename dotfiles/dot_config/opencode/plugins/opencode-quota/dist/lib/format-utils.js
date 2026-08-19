/**
 * Shared formatting utilities for quota display.
 *
 * These primitives are used by:
 * - format.ts (classic toast)
 * - toast-format-grouped.ts (grouped toast)
 * - quota-command-format.ts (/quota command)
 */
/**
 * Clamp a number to an integer within [min, max].
 */
export function clampInt(n, min, max) {
    return Math.max(min, Math.min(max, Math.trunc(n)));
}
/**
 * Clamp a value to a percentage [0..100], rounding to the nearest integer.
 * Returns 0 for non-finite inputs.
 */
export function clampPercent(n) {
    if (!Number.isFinite(n))
        return 0;
    return Math.max(0, Math.min(100, Math.round(n)));
}
/**
 * Pad string to width, truncating if too long, adding spaces on right if too short.
 */
export function padRight(str, width) {
    if (str.length >= width)
        return str.slice(0, width);
    return str + " ".repeat(width - str.length);
}
/**
 * Pad string to width, truncating from start if too long, adding spaces on left if too short.
 */
export function padLeft(str, width) {
    if (str.length >= width)
        return str.slice(str.length - width);
    return " ".repeat(width - str.length) + str;
}
/**
 * Render a progress bar of filled/empty blocks.
 */
export function bar(percentRemaining, width) {
    const p = clampInt(percentRemaining, 0, 100);
    const filled = Math.round((p / 100) * width);
    const empty = width - filled;
    return "█".repeat(filled) + "░".repeat(empty);
}
/**
 * Resolve the displayed percent for toast/sidebar percent rows without
 * changing the underlying provider-normalized percentRemaining value.
 */
export function resolveDisplayedPercent(percentRemaining, mode = "remaining") {
    const remaining = Math.max(0, Math.round(percentRemaining));
    const used = Math.max(0, Math.round(100 - percentRemaining));
    return mode === "used" ? used : remaining;
}
export function formatDisplayedPercentLabel(percentRemaining, mode = "remaining") {
    const displayedPercent = resolveDisplayedPercent(percentRemaining, mode);
    return `${displayedPercent}% ${mode === "used" ? "used" : "left"}`;
}
export const DISPLAYED_PERCENT_LABEL_WIDTH = "100% used".length;
/**
 * Format a token count with K/M suffix for compactness.
 *
 * Examples:
 * - 500 -> "500"
 * - 1500 -> "1.5K"
 * - 15000 -> "15K"
 * - 1500000 -> "1.5M"
 */
export function formatTokenCount(count) {
    if (count >= 1_000_000) {
        return `${(count / 1_000_000).toFixed(1)}M`;
    }
    if (count >= 10_000) {
        return `${(count / 1_000).toFixed(0)}K`;
    }
    if (count >= 1_000) {
        return `${(count / 1_000).toFixed(1)}K`;
    }
    return String(count);
}
/**
 * Shorten model name for compact display.
 *
 * Removes common prefixes/suffixes before truncating with ellipsis.
 */
export function fmtUsdAmount(n) {
    if (!Number.isFinite(n))
        return "$0.00";
    return `$${n.toFixed(2)}`;
}
function pad2(n) {
    return String(Math.trunc(n)).padStart(2, "0");
}
export function formatLocalCallTimestamp(atMs) {
    const safeMs = typeof atMs === "number" && Number.isFinite(atMs) ? atMs : Date.now();
    const d = new Date(safeMs);
    return `${pad2(d.getHours())}:${pad2(d.getMinutes())} ${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
}
export function renderCommandHeading(params) {
    return `# ${params.title} ${formatLocalCallTimestamp(params.generatedAtMs)}`;
}
export function abbreviateDisplayedModelName(name) {
    return name.replace(/antigravity/gi, "agy");
}
export function shortenModelName(name, maxLen) {
    const abbreviated = abbreviateDisplayedModelName(name);
    if (abbreviated.length <= maxLen)
        return abbreviated;
    // Remove common suffixes before truncating.
    const s = abbreviated.replace(/-thinking$/i, "").replace(/-preview$/i, "");
    if (s.length <= maxLen)
        return s;
    // Truncate with ellipsis
    return s.slice(0, maxLen - 1) + "\u2026";
}
const MS_PER_DAY = 86_400_000;
const MS_PER_HOUR = 3_600_000;
/**
 * Format a reset countdown for toast display.
 *
 * Returns human-readable time like "2d 5h" or "3h 45m".
 * When reset time is in the past or invalid, returns "reset".
 */
export function formatResetCountdown(iso, opts) {
    if (!iso)
        return opts?.missing ?? "";
    const resetDate = new Date(iso);
    const now = new Date();
    const diffMs = resetDate.getTime() - now.getTime();
    if (!Number.isFinite(diffMs) || diffMs <= 0)
        return "reset";
    const diffMinutes = Math.floor(diffMs / 60000);
    const days = Math.floor(diffMinutes / 1440);
    const hours = Math.floor((diffMinutes % 1440) / 60);
    const minutes = diffMinutes % 60;
    if (opts?.compactRounded) {
        const decimals = opts.decimals;
        if (isResetTimeDecimals(decimals)) {
            if (days > 0)
                return `${(diffMs / MS_PER_DAY).toFixed(decimals)}d`;
            const formattedHours = (diffMs / MS_PER_HOUR).toFixed(decimals);
            if (Number(formattedHours) > 0)
                return `${formattedHours}h`;
            return `${Math.max(1, Math.ceil(diffMs / 60_000))}m`;
        }
        if (days > 0)
            return `${days}d`;
        const halfHours = Math.ceil(diffMinutes / 30);
        const h = Math.floor(halfHours / 2);
        if (h > 0)
            return halfHours % 2 === 1 ? `${h}.5h` : `${h}h`;
        return `0.5h`;
    }
    if (days > 0)
        return `${days}d ${hours}h`;
    return `${hours}h ${minutes}m`;
}
export const MAX_RESET_TIME_DECIMALS = 4;
export function isResetTimeDecimals(value) {
    return (typeof value === "number" &&
        Number.isInteger(value) &&
        value >= 0 &&
        value <= MAX_RESET_TIME_DECIMALS);
}
//# sourceMappingURL=format-utils.js.map