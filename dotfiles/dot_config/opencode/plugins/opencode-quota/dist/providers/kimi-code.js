import { queryKimiQuota } from "../lib/kimi.js";
import { DEFAULT_KIMI_AUTH_CACHE_MAX_AGE_MS, getKimiAuthDiagnostics, resolveKimiAuthCached, } from "../lib/kimi-auth.js";
import { isCanonicalProviderAvailable } from "../lib/provider-availability.js";
import { normalizeQuotaProviderId } from "../lib/provider-metadata.js";
import { apiKeyStatusDetails, attemptedErrorResult, attemptedResult, notAttemptedResult, withStatusDetails, } from "./result-helpers.js";
function formatUsageRight(window) {
    return `${window.used}/${window.limit}`;
}
export const kimiCodeProvider = {
    id: "kimi-for-coding",
    async isAvailable(ctx) {
        const providerAvailable = await isCanonicalProviderAvailable({
            ctx,
            providerId: "kimi-for-coding",
            fallbackOnError: false,
        });
        if (!providerAvailable) {
            return false;
        }
        const auth = await resolveKimiAuthCached({
            maxAgeMs: DEFAULT_KIMI_AUTH_CACHE_MAX_AGE_MS,
        });
        return auth.state === "configured" || auth.state === "invalid";
    },
    matchesCurrentModel(model) {
        const [provider] = model.toLowerCase().split("/", 2);
        return normalizeQuotaProviderId(provider) === "kimi-for-coding";
    },
    async fetch(ctx) {
        const diagnostics = await getKimiAuthDiagnostics({
            maxAgeMs: DEFAULT_KIMI_AUTH_CACHE_MAX_AGE_MS,
        });
        const authDetails = apiKeyStatusDetails(diagnostics);
        const auth = await resolveKimiAuthCached({
            maxAgeMs: DEFAULT_KIMI_AUTH_CACHE_MAX_AGE_MS,
        });
        if (auth.state === "none") {
            return withStatusDetails(notAttemptedResult(), authDetails);
        }
        if (auth.state === "invalid") {
            return withStatusDetails(attemptedErrorResult("Kimi Code", auth.error), authDetails);
        }
        const result = await queryKimiQuota({ requestTimeoutMs: ctx.config?.requestTimeoutMs });
        if (!result) {
            return withStatusDetails(notAttemptedResult(), [
                ...authDetails,
                { key: "live_fetch_error", value: "Kimi API key became unavailable before fetch" },
            ]);
        }
        if (!result.success) {
            return withStatusDetails(attemptedErrorResult("Kimi Code", result.error), [
                ...authDetails,
                { key: "live_fetch_error", value: result.error },
            ]);
        }
        const entries = result.windows.map((window) => ({
            accounting: {
                resultType: "quota",
                acquisitionMethod: "remote_api",
                ownership: "maintained",
                authority: "provider_reported",
            },
            name: `${result.label} ${window.label}`,
            group: result.label,
            label: `${window.label}:`,
            right: formatUsageRight(window),
            percentRemaining: window.percentRemaining,
            resetTimeIso: window.resetTimeIso,
        }));
        return withStatusDetails(attemptedResult(entries, [], {
            singleWindowDisplayName: result.label,
        }), [
            ...authDetails,
            ...result.windows.map((window) => ({
                key: window.label.toLowerCase().replace(/\s+/g, "_"),
                value: `used=${window.used}/${window.limit} percent_remaining=${window.percentRemaining} reset_at=${window.resetTimeIso ?? "(none)"}`,
            })),
            ...(result.windows.length === 0
                ? [{ key: "live_state", value: "no reportable Kimi quota" }]
                : []),
        ]);
    },
};
//# sourceMappingURL=kimi-code.js.map