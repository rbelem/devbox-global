/**
 * Command parsing helpers extracted from plugin.ts.
 *
 * These utilities handle argument parsing for `/tokens_between`,
 * `/quota_status`, and other slash commands.
 */
/** Parsed YYYY-MM-DD date components. */
export type Ymd = {
    y: number;
    m: number;
    d: number;
};
/**
 * Parse optional JSON arguments from a command input string.
 */
export declare function parseOptionalJsonArgs(input: string | undefined): {
    ok: true;
    value: Record<string, unknown>;
} | {
    ok: false;
    error: string;
};
/**
 * Parse a YYYY-MM-DD string. Returns null if invalid format or invalid date.
 */
export declare function parseYyyyMmDd(input: string): Ymd | null;
/**
 * Get the start of a local day (midnight) in milliseconds.
 */
export declare function startOfLocalDayMs(ymd: Ymd): number;
/**
 * Get the start of the next local day (midnight of the following day) in milliseconds.
 * Used for inclusive end date: untilMs = startOfNextLocalDayMs(end) (exclusive upper bound).
 */
export declare function startOfNextLocalDayMs(ymd: Ymd): number;
/**
 * Parse /tokens_between arguments. Supports:
 * - Positional: "2026-01-01 2026-01-15"
 * - JSON: {"starting_date":"2026-01-01","ending_date":"2026-01-15"}
 */
export declare function parseQuotaBetweenArgs(input: string | undefined): {
    ok: true;
    startYmd: Ymd;
    endYmd: Ymd;
} | {
    ok: false;
    error: string;
};
/**
 * Format a Ymd as YYYY-MM-DD string.
 */
export declare function formatYmd(ymd: Ymd): string;
//# sourceMappingURL=command-parsing.d.ts.map