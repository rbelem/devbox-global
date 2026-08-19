/**
 * DeepSeek provider wrapper.
 *
 * Queries the DeepSeek /user/balance endpoint and displays the
 * account balance as a value entry.
 */
import { formatDeepSeekBalanceValue, getDeepSeekKeyDiagnostics, hasDeepSeekApiKeyConfigured, queryDeepSeekBalance, } from "../lib/deepseek.js";
import { isCanonicalProviderAvailable } from "../lib/provider-availability.js";
import { modelProviderIncludesAny } from "../lib/provider-model-matching.js";
import { attemptedResult, mapNullableProviderResult, simpleApiKeyStatusDetails, withStatusDetails, } from "./result-helpers.js";
function buildDeepSeekEntries(result) {
    const entries = [];
    for (const info of result.balanceInfos) {
        entries.push({
            kind: "value",
            accounting: {
                resultType: "balance",
                acquisitionMethod: "remote_api",
                ownership: "maintained",
                authority: "provider_reported",
            },
            name: "DeepSeek Balance",
            group: "DeepSeek",
            label: "Balance:",
            value: formatDeepSeekBalanceValue({
                currency: info.currency,
                totalBalance: info.totalBalance,
            }),
        });
    }
    // If the API returned no balance info, show the availability status
    if (entries.length === 0) {
        entries.push({
            kind: "value",
            accounting: {
                resultType: "status",
                acquisitionMethod: "remote_api",
                ownership: "maintained",
                authority: "provider_reported",
            },
            name: "DeepSeek",
            group: "DeepSeek",
            label: "Status:",
            value: result.isAvailable ? "Available" : "Low balance",
        });
    }
    return entries;
}
export const deepseekProvider = {
    id: "deepseek",
    async isAvailable(ctx) {
        // Check if the deepseek provider exists in opencode config
        const providerAvailable = await isCanonicalProviderAvailable({
            ctx,
            providerId: "deepseek",
            fallbackOnError: false,
        });
        if (providerAvailable)
            return true;
        return await hasDeepSeekApiKeyConfigured();
    },
    matchesCurrentModel(model) {
        return modelProviderIncludesAny(model, ["deepseek"]);
    },
    async fetch(ctx) {
        const diagnostics = await getDeepSeekKeyDiagnostics().catch(() => ({
            configured: false,
            source: null,
            checkedPaths: [],
            authPaths: [],
        }));
        const result = await queryDeepSeekBalance({ requestTimeoutMs: ctx.config?.requestTimeoutMs });
        const providerResult = mapNullableProviderResult(result, {
            errorLabel: "DeepSeek",
            onSuccess: (result) => attemptedResult(buildDeepSeekEntries(result)),
        });
        return withStatusDetails(providerResult, simpleApiKeyStatusDetails(diagnostics));
    },
};
//# sourceMappingURL=deepseek.js.map