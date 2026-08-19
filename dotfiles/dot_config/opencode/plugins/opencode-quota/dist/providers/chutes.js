/**
 * Chutes AI provider wrapper.
 */
import { getChutesKeyDiagnostics, hasChutesApiKeyConfigured, queryChutesQuota, } from "../lib/chutes.js";
import { isCanonicalProviderAvailable } from "../lib/provider-availability.js";
import { modelProviderIncludesAny } from "../lib/provider-model-matching.js";
import { attemptedResult, mapNullableProviderResult, withStatusDetails } from "./result-helpers.js";
export const chutesProvider = {
    id: "chutes",
    async isAvailable(ctx) {
        const providerAvailable = await isCanonicalProviderAvailable({
            ctx,
            providerId: "chutes",
            fallbackOnError: false,
        });
        if (providerAvailable)
            return true;
        return await hasChutesApiKeyConfigured();
    },
    matchesCurrentModel(model) {
        return modelProviderIncludesAny(model, ["chutes"]);
    },
    async fetch(ctx) {
        const diagnostics = await getChutesKeyDiagnostics().catch(() => ({
            configured: false,
            source: null,
            checkedPaths: [],
        }));
        const result = await queryChutesQuota({ requestTimeoutMs: ctx.config?.requestTimeoutMs });
        const providerResult = mapNullableProviderResult(result, {
            errorLabel: "Chutes",
            onSuccess: (result) => attemptedResult([
                {
                    accounting: {
                        resultType: "quota",
                        acquisitionMethod: "remote_api",
                        ownership: "maintained",
                        authority: "provider_reported",
                    },
                    name: "Chutes",
                    percentRemaining: result.percentRemaining,
                    resetTimeIso: result.resetTimeIso,
                },
            ]),
        });
        const detail = `configured=${diagnostics.configured ? "true" : "false"}${diagnostics.source ? ` source=${diagnostics.source}` : ""}${diagnostics.checkedPaths.length > 0 ? ` checked=${diagnostics.checkedPaths.join(" | ")}` : ""}`;
        return withStatusDetails(providerResult, [{ key: "chutes api key", value: detail }]);
    },
};
//# sourceMappingURL=chutes.js.map