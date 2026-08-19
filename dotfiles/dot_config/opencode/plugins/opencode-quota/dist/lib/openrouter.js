/**
 * OpenRouter key usage fetcher.
 *
 * Reuses the custom-provider OpenRouter mapping so built-in and custom
 * OpenRouter sources interpret the API response identically.
 */
import { fetchRemoteQuotaProvider, resolveQuotaProviderApiKey, } from "./quota-providers-remote.js";
const OPENROUTER_KEY_SOURCE = {
    id: "openrouter",
    providerId: "openrouter",
    label: "OpenRouter",
    mode: "remote-api",
    url: "https://openrouter.ai/api/v1/key",
    apiKeyEnv: "OPENROUTER_API_KEY",
    format: "openrouter-key-v1",
};
export async function resolveOpenRouterApiKey() {
    return await resolveQuotaProviderApiKey(OPENROUTER_KEY_SOURCE);
}
export async function hasOpenRouterApiKeyConfigured() {
    return Boolean((await resolveOpenRouterApiKey()).key);
}
export async function queryOpenRouterQuota(options = {}) {
    const resolved = await resolveOpenRouterApiKey();
    if (!resolved.key)
        return null;
    const result = await fetchRemoteQuotaProvider(OPENROUTER_KEY_SOURCE, resolved.key, options.requestTimeoutMs);
    if (!result.success)
        return result;
    return {
        ...result,
        entries: result.entries.map((entry) => ({
            ...entry,
            accounting: {
                ...entry.accounting,
                ownership: "maintained",
            },
        })),
    };
}
//# sourceMappingURL=openrouter.js.map