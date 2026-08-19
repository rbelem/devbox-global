/**
 * Shared formatting utilities for quota display.
 *
 * These primitives are used by:
 * - format.ts (classic toast)
 * - toast-format-grouped.ts (grouped toast)
 * - quota-command-format.ts (/quota command)
 */
import type { PercentDisplayMode } from "./types.js";
/**
 * Clamp a number to an integer within [min, max].
 */
export declare function clampInt(n: number, min: number, max: number): number;
/**
 * Clamp a value to a percentage [0..100], rounding to the nearest integer.
 * Returns 0 for non-finite inputs.
 */
export declare function clampPercent(n: number): number;
/**
 * Pad string to width, truncating if too long, adding spaces on right if too short.
 */
export declare function padRight(str: string, width: number): string;
/**
 * Pad string to width, truncating from start if too long, adding spaces on left if too short.
 */
export declare function padLeft(str: string, width: number): string;
/**
 * Render a progress bar of filled/empty blocks.
 */
export declare function bar(percentRemaining: number, width: number): string;
/**
 * Resolve the displayed percent for toast/sidebar percent rows without
 * changing the underlying provider-normalized percentRemaining value.
 */
export declare function resolveDisplayedPercent(percentRemaining: number, mode?: PercentDisplayMode): number;
export declare function formatDisplayedPercentLabel(percentRemaining: number, mode?: PercentDisplayMode): string;
export declare const DISPLAYED_PERCENT_LABEL_WIDTH: number;
/**
 * Format a token count with K/M suffix for compactness.
 *
 * Examples:
 * - 500 -> "500"
 * - 1500 -> "1.5K"
 * - 15000 -> "15K"
 * - 1500000 -> "1.5M"
 */
export declare function formatTokenCount(count: number): string;
/**
 * Shorten model name for compact display.
 *
 * Removes common prefixes/suffixes before truncating with ellipsis.
 */
export declare function fmtUsdAmount(n: number): string;
export declare function formatLocalCallTimestamp(atMs?: number): string;
export declare function renderCommandHeading(params: {
    title: string;
    generatedAtMs?: number;
}): string;
export declare function abbreviateDisplayedModelName(name: string): string;
export declare function shortenModelName(name: string, maxLen: number): string;
export interface FormatResetCountdownOptions {
    /**
     * String to return when ISO timestamp is missing/undefined.
     * - Classic toast uses "-"
     * - Grouped toast uses ""
     */
    missing?: string;
    /**
     * When true, rounds down to the largest active unit.
     * - 13d 5h -> 13d
     * - 2h 14m -> 2h
     * - 14m -> 14m
     */
    compactRounded?: boolean;
    /**
     * When set with compactRounded, render the largest active unit with this
     * many decimal places instead of the default integer-day / half-hour steps.
     */
    decimals?: number;
}
/**
 * Format a reset countdown for toast display.
 *
 * Returns human-readable time like "2d 5h" or "3h 45m".
 * When reset time is in the past or invalid, returns "reset".
 */
export declare function formatResetCountdown(iso?: string, opts?: FormatResetCountdownOptions): string;
export declare const MAX_RESET_TIME_DECIMALS = 4;
export declare function isResetTimeDecimals(value: unknown): value is number;
//# sourceMappingURL=format-utils.d.ts.map