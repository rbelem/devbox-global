import { readFile } from "fs/promises";
import { sanitizeDisplayText } from "../lib/display-sanitize.js";
export function notAttemptedResult() {
    return { attempted: false, entries: [], errors: [] };
}
export function attemptedResult(entries, errors = [], presentation) {
    return {
        attempted: true,
        entries,
        errors,
        ...(presentation ? { presentation } : {}),
    };
}
export function attemptedErrorResult(label, message) {
    return attemptedResult([], [{ label, message }]);
}
export function statusDetailsFromRecord(values) {
    return Object.entries(values).flatMap(([key, value]) => value === undefined ? [] : [{ key, value }]);
}
export function configStatusDetails(diagnostics) {
    return statusDetailsFromRecord({
        config_state: diagnostics.state,
        config_source: diagnostics.source ?? "(none)",
        config_missing: diagnostics.missing ?? undefined,
        config_error: diagnostics.error ?? undefined,
        config_checked_paths: diagnostics.checkedPaths.join(" | ") || "(none)",
    });
}
export function simpleApiKeyStatusDetails(diagnostics) {
    return statusDetailsFromRecord({
        api_key_configured: diagnostics.configured ? "true" : "false",
        api_key_source: diagnostics.source ?? "(none)",
        api_key_checked_paths: diagnostics.checkedPaths.join(" | ") || "(none)",
        api_key_auth_paths: diagnostics.authPaths.join(" | ") || "(none)",
    });
}
export function apiKeyStatusDetails(diagnostics) {
    return statusDetailsFromRecord({
        auth_state: diagnostics.state,
        api_key_configured: diagnostics.state === "configured" ? "true" : "false",
        api_key_source: diagnostics.source ?? "(none)",
        api_key_checked_paths: diagnostics.checkedPaths.join(" | ") || "(none)",
        api_key_auth_paths: diagnostics.authPaths.join(" | ") || "(none)",
        auth_error: diagnostics.error ? sanitizeDisplayText(diagnostics.error) : undefined,
    });
}
export function withStatusDetails(result, statusDetails) {
    return {
        ...result,
        statusDetails: statusDetails.map((detail) => ({ ...detail })),
    };
}
export async function inspectGeneratedCounterFile(path, expectedVersion) {
    try {
        const parsed = JSON.parse(await readFile(path, "utf8"));
        const record = parsed && typeof parsed === "object" && !Array.isArray(parsed)
            ? parsed
            : null;
        const version = typeof record?.version === "number" ? record.version : null;
        const updatedAt = typeof record?.updatedAt === "number" && Number.isFinite(record.updatedAt)
            ? record.updatedAt
            : null;
        return {
            exists: true,
            health: !record || version === null || updatedAt === null
                ? "malformed"
                : version === expectedVersion
                    ? "healthy"
                    : "version_mismatch",
            version,
            lastUpdatedAt: updatedAt,
        };
    }
    catch (error) {
        if (error &&
            typeof error === "object" &&
            "code" in error &&
            String(error.code) === "ENOENT") {
            return { exists: false, health: "missing", version: null, lastUpdatedAt: null };
        }
        return { exists: true, health: "malformed", version: null, lastUpdatedAt: null };
    }
}
export function mapNullableProviderResult(result, params) {
    if (!result) {
        return notAttemptedResult();
    }
    if (!result.success) {
        return attemptedErrorResult(params.errorLabel, result.error);
    }
    return params.onSuccess(result);
}
export function groupedPercentWindowEntries(params) {
    const entries = [];
    for (const { window, suffix, label } of params.windows) {
        if (!window)
            continue;
        entries.push({
            accounting: { ...params.accounting },
            name: `${params.group} ${suffix}`,
            group: params.group,
            label,
            percentRemaining: window.percentRemaining,
            resetTimeIso: window.resetTimeIso,
        });
    }
    if (entries.length === 0 && params.fallbackWhenEmpty !== false) {
        entries.push({
            accounting: { ...params.accounting },
            name: params.group,
            percentRemaining: 0,
        });
    }
    return entries;
}
//# sourceMappingURL=result-helpers.js.map