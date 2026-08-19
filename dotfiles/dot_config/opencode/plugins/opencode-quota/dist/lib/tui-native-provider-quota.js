function isRecord(value) {
    return Boolean(value) && typeof value === "object";
}
function isQuotaApiLike(value) {
    return Boolean(value) && (typeof value === "object" || typeof value === "function");
}
/**
 * Detect whether an OpenCode client advertises native provider-quota support.
 *
 * This is intentionally a no-fetch duck-typing guard for slot-registration decisions.
 */
export function hasNativeProviderQuotaClient(client) {
    if (!isRecord(client))
        return false;
    const experimental = client.experimental;
    if (!isRecord(experimental))
        return false;
    if (isQuotaApiLike(experimental.providerQuota))
        return true;
    if (isQuotaApiLike(experimental.provider_quota))
        return true;
    const provider = experimental.provider;
    return isRecord(provider) && isQuotaApiLike(provider.quota);
}
//# sourceMappingURL=tui-native-provider-quota.js.map