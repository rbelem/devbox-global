/**
 * Command parsing helpers extracted from plugin.ts.
 *
 * These utilities handle argument parsing for `/tokens_between`,
 * `/quota_status`, and other slash commands.
 */
/**
 * Parse optional JSON arguments from a command input string.
 */
export function parseOptionalJsonArgs(input) {
    const raw = input?.trim() || "";
    if (!raw)
        return { ok: true, value: {} };
    try {
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
            return { ok: false, error: 'Arguments must be a JSON object (e.g. {"force":true}).' };
        }
        return { ok: true, value: parsed };
    }
    catch {
        return { ok: false, error: "Failed to parse JSON arguments." };
    }
}
/**
 * Parse a YYYY-MM-DD string. Returns null if invalid format or invalid date.
 */
export function parseYyyyMmDd(input) {
    const pattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!pattern.test(input))
        return null;
    const [yStr, mStr, dStr] = input.split("-");
    const y = parseInt(yStr, 10);
    const m = parseInt(mStr, 10);
    const d = parseInt(dStr, 10);
    // Validate by round-trip: construct a Date and check components match
    const date = new Date(y, m - 1, d);
    if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
        return null; // Invalid date (e.g., 2026-02-31)
    }
    return { y, m, d };
}
/**
 * Get the start of a local day (midnight) in milliseconds.
 */
export function startOfLocalDayMs(ymd) {
    return new Date(ymd.y, ymd.m - 1, ymd.d).getTime();
}
/**
 * Get the start of the next local day (midnight of the following day) in milliseconds.
 * Used for inclusive end date: untilMs = startOfNextLocalDayMs(end) (exclusive upper bound).
 */
export function startOfNextLocalDayMs(ymd) {
    return new Date(ymd.y, ymd.m - 1, ymd.d + 1).getTime();
}
/**
 * Parse /tokens_between arguments. Supports:
 * - Positional: "2026-01-01 2026-01-15"
 * - JSON: {"starting_date":"2026-01-01","ending_date":"2026-01-15"}
 */
export function parseQuotaBetweenArgs(input) {
    const raw = input?.trim() || "";
    if (!raw) {
        return {
            ok: false,
            error: "Missing arguments. Expected two dates in YYYY-MM-DD format.",
        };
    }
    let startStr;
    let endStr;
    if (raw.startsWith("{")) {
        // JSON format
        try {
            const parsed = JSON.parse(raw);
            startStr = String(parsed["starting_date"] ?? parsed["startingDate"] ?? "");
            endStr = String(parsed["ending_date"] ?? parsed["endingDate"] ?? "");
        }
        catch {
            return { ok: false, error: "Failed to parse JSON arguments." };
        }
    }
    else {
        // Positional format: split on whitespace
        const parts = raw.split(/\s+/);
        if (parts.length !== 2) {
            return {
                ok: false,
                error: "Expected exactly two dates in YYYY-MM-DD format.",
            };
        }
        [startStr, endStr] = parts;
    }
    const startYmd = parseYyyyMmDd(startStr);
    if (!startYmd) {
        return { ok: false, error: `Invalid starting date: "${startStr}". Expected YYYY-MM-DD.` };
    }
    const endYmd = parseYyyyMmDd(endStr);
    if (!endYmd) {
        return { ok: false, error: `Invalid ending date: "${endStr}". Expected YYYY-MM-DD.` };
    }
    // Check end >= start
    const startMs = startOfLocalDayMs(startYmd);
    const endMs = startOfLocalDayMs(endYmd);
    if (endMs < startMs) {
        return {
            ok: false,
            error: `Ending date (${endStr}) is before starting date (${startStr}).`,
        };
    }
    return { ok: true, startYmd, endYmd };
}
/**
 * Format a Ymd as YYYY-MM-DD string.
 */
export function formatYmd(ymd) {
    const y = String(ymd.y).padStart(4, "0");
    const m = String(ymd.m).padStart(2, "0");
    const d = String(ymd.d).padStart(2, "0");
    return `${y}-${m}-${d}`;
}
//# sourceMappingURL=command-parsing.js.map