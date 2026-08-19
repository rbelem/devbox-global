/**
 * OpenRouter provider wrapper.
 */
import { hasOpenRouterApiKeyConfigured, queryOpenRouterQuota } from "../lib/openrouter.js";
import { modelProviderMatchesRuntimeId } from "../lib/provider-model-matching.js";
import { attemptedResult, mapNullableProviderResult } from "./result-helpers.js";
export const openRouterProvider = {
    id: "openrouter",
    async isAvailable(_ctx) {
        return await hasOpenRouterApiKeyConfigured();
    },
    matchesCurrentModel(model) {
        return modelProviderMatchesRuntimeId(model, "openrouter");
    },
    async fetch(ctx) {
        const result = await queryOpenRouterQuota({
            requestTimeoutMs: ctx.config?.requestTimeoutMs,
        });
        return mapNullableProviderResult(result, {
            errorLabel: "OpenRouter",
            onSuccess: (success) => attemptedResult(success.entries, success.rowErrors?.map((message) => ({ label: "OpenRouter", message })) ?? [], { singleWindowShowRight: true }),
        });
    },
};
//# sourceMappingURL=openrouter.js.map