/**
 * NanoGPT provider wrapper.
 */
import { fmtUsdAmount } from "../lib/format-utils.js";
import { formatNanoGptBalanceValue, getNanoGptKeyDiagnostics, hasNanoGptApiKeyConfigured, queryNanoGptQuota, } from "../lib/nanogpt.js";
import { modelProviderMatchesRuntimeId } from "../lib/provider-model-matching.js";
import { attemptedResult, mapNullableProviderResult, simpleApiKeyStatusDetails, statusDetailsFromRecord, withStatusDetails, } from "./result-helpers.js";
function formatUsageAmount(value) {
    if (!Number.isFinite(value))
        return "0";
    if (Number.isInteger(value))
        return String(Math.trunc(value));
    return value.toFixed(2).replace(/\.?0+$/, "");
}
function formatUsageRight(window) {
    return `${formatUsageAmount(window.used)}/${formatUsageAmount(window.limit)}`;
}
function mapNanoGptSuccess(result) {
    const entries = [];
    const errors = result.endpointErrors?.map((entry) => ({
        label: entry.endpoint === "usage" ? "NanoGPT Usage" : "NanoGPT Balance",
        message: entry.message,
    })) ?? [];
    const subscription = result.subscription;
    if (subscription?.daily) {
        entries.push({
            accounting: {
                resultType: "quota",
                acquisitionMethod: "remote_api",
                ownership: "maintained",
                authority: "provider_reported",
            },
            name: "NanoGPT Daily",
            group: "NanoGPT",
            label: "Daily:",
            right: formatUsageRight(subscription.daily),
            percentRemaining: subscription.daily.percentRemaining,
            resetTimeIso: subscription.daily.resetTimeIso,
        });
    }
    if (subscription?.monthly) {
        entries.push({
            accounting: {
                resultType: "quota",
                acquisitionMethod: "remote_api",
                ownership: "maintained",
                authority: "provider_reported",
            },
            name: "NanoGPT Monthly",
            group: "NanoGPT",
            label: "Monthly:",
            right: formatUsageRight(subscription.monthly),
            percentRemaining: subscription.monthly.percentRemaining,
            resetTimeIso: subscription.monthly.resetTimeIso,
        });
    }
    const balanceValue = result.balance ? formatNanoGptBalanceValue(result.balance) : null;
    if (balanceValue) {
        entries.push({
            kind: "value",
            accounting: {
                resultType: "balance",
                acquisitionMethod: "remote_api",
                ownership: "maintained",
                authority: "provider_reported",
            },
            name: "NanoGPT Balance",
            group: "NanoGPT",
            label: "Balance:",
            value: balanceValue,
        });
    }
    if (subscription?.state && subscription.state.toLowerCase() !== "active") {
        errors.push({
            label: "NanoGPT",
            message: `Subscription state: ${subscription.state}`,
        });
    }
    if (entries.length === 0) {
        errors.push({
            label: "NanoGPT",
            message: "No usable NanoGPT quota or balance data",
        });
    }
    const formatSubscriptionUsage = (usage) => usage
        ? `${formatUsageAmount(usage.used)}/${formatUsageAmount(usage.limit)} remaining=${formatUsageAmount(usage.remaining)} percent_remaining=${usage.percentRemaining} reset_at=${usage.resetTimeIso ?? "(none)"}`
        : undefined;
    const statusDetails = [
        ...statusDetailsFromRecord({
            subscription_active: subscription ? (subscription.active ? "true" : "false") : undefined,
            subscription_state: subscription?.state,
            enforce_daily_limit: subscription
                ? subscription.enforceDailyLimit
                    ? "true"
                    : "false"
                : undefined,
            daily_usage: formatSubscriptionUsage(subscription?.daily),
            monthly_usage: formatSubscriptionUsage(subscription?.monthly),
            billing_period_end: subscription ? (subscription.currentPeriodEndIso ?? "(none)") : undefined,
            grace_until: subscription?.graceUntilIso,
            balance_usd: typeof result.balance?.usdBalance === "number"
                ? fmtUsdAmount(result.balance.usdBalance)
                : "(none)",
            balance_nano: result.balance?.nanoBalanceRaw ?? "(none)",
        }),
        ...(result.endpointErrors ?? []).map((endpointError) => ({
            key: `live_error_${endpointError.endpoint}`,
            value: endpointError.message,
        })),
    ];
    return withStatusDetails(attemptedResult(entries, errors), statusDetails);
}
export const nanoGptProvider = {
    id: "nanogpt",
    async isAvailable(_ctx) {
        return await hasNanoGptApiKeyConfigured();
    },
    matchesCurrentModel(model) {
        return modelProviderMatchesRuntimeId(model, "nanogpt");
    },
    async fetch(ctx) {
        const diagnostics = await getNanoGptKeyDiagnostics().catch(() => ({
            configured: false,
            source: null,
            checkedPaths: [],
            authPaths: [],
        }));
        const result = await queryNanoGptQuota({ requestTimeoutMs: ctx.config?.requestTimeoutMs });
        const providerResult = mapNullableProviderResult(result, {
            errorLabel: "NanoGPT",
            onSuccess: mapNanoGptSuccess,
        });
        return withStatusDetails(providerResult, [
            ...simpleApiKeyStatusDetails(diagnostics),
            ...(providerResult.statusDetails ?? []),
        ]);
    },
};
//# sourceMappingURL=nanogpt.js.map