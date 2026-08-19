/**
 * Synthetic provider wrapper.
 */
import { isCanonicalProviderAvailable } from "../lib/provider-availability.js";
import { modelProviderIncludesAny } from "../lib/provider-model-matching.js";
import { getSyntheticKeyDiagnostics, hasSyntheticApiKeyConfigured, querySyntheticQuota, } from "../lib/synthetic.js";
import { attemptedResult, mapNullableProviderResult, withStatusDetails } from "./result-helpers.js";
function formatSyntheticRoundedValue(value) {
    if (!Number.isFinite(value))
        return "0";
    return String(Math.max(0, Math.round(value)));
}
function formatSyntheticSummary(window, currency = false) {
    const used = formatSyntheticRoundedValue(window.used);
    const limit = formatSyntheticRoundedValue(window.limit);
    return currency ? `$${used}/$${limit}` : `${used}/${limit}`;
}
function toSyntheticEntry(params) {
    const right = formatSyntheticSummary(params.window, params.currency);
    return {
        accounting: {
            resultType: "quota",
            acquisitionMethod: "remote_api",
            ownership: "maintained",
            authority: "provider_reported",
        },
        name: `Synthetic ${params.suffix}`,
        group: "Synthetic",
        label: params.label,
        percentRemaining: params.window.percentRemaining,
        right,
        resetTimeIso: params.window.resetTimeIso,
    };
}
export const syntheticProvider = {
    id: "synthetic",
    async isAvailable(ctx) {
        const providerAvailable = await isCanonicalProviderAvailable({
            ctx,
            providerId: "synthetic",
            fallbackOnError: false,
        });
        if (providerAvailable)
            return true;
        return await hasSyntheticApiKeyConfigured();
    },
    matchesCurrentModel(model) {
        return modelProviderIncludesAny(model, ["synthetic"]);
    },
    async fetch(ctx) {
        const diagnostics = await getSyntheticKeyDiagnostics().catch(() => ({
            configured: false,
            source: null,
            checkedPaths: [],
        }));
        const result = await querySyntheticQuota({ requestTimeoutMs: ctx.config?.requestTimeoutMs });
        const providerResult = mapNullableProviderResult(result, {
            errorLabel: "Synthetic",
            onSuccess: (result) => attemptedResult([
                toSyntheticEntry({
                    window: result.windows.fiveHour,
                    suffix: "5h",
                    label: "5h:",
                }),
                toSyntheticEntry({
                    window: result.windows.weekly,
                    suffix: "Weekly",
                    label: "Weekly:",
                    currency: true,
                }),
            ], [], {
                singleWindowShowRight: true,
            }),
        });
        const detail = `configured=${diagnostics.configured ? "true" : "false"}${diagnostics.source ? ` source=${diagnostics.source}` : ""}${diagnostics.checkedPaths.length > 0 ? ` checked=${diagnostics.checkedPaths.join(" | ")}` : ""}`;
        return withStatusDetails(providerResult, [{ key: "synthetic api key", value: detail }]);
    },
};
//# sourceMappingURL=synthetic.js.map