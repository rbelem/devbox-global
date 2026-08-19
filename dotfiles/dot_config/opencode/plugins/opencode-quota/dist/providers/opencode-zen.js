import { sanitizeDisplayText } from "../lib/display-sanitize.js";
import { OPENCODE_ZEN_BILLING_UNITS_PER_DOLLAR, queryOpenCodeZenQuota, } from "../lib/opencode-zen.js";
import { DEFAULT_OPENCODE_ZEN_CONFIG_CACHE_MAX_AGE_MS, getOpenCodeZenConfigDiagnostics, resolveOpenCodeZenConfigCached, } from "../lib/opencode-zen-config.js";
import { normalizeQuotaProviderId } from "../lib/provider-metadata.js";
import { attemptedErrorResult, attemptedResult, configStatusDetails, notAttemptedResult, withStatusDetails, } from "./result-helpers.js";
const OPENCODE_PROVIDER_LABEL = "OpenCode";
const OPENCODE_ZEN_GROUP = "OpenCode Zen";
const OPENCODE_ZEN_BALANCE_ACCOUNTING = {
    resultType: "balance",
    acquisitionMethod: "dashboard_scrape",
    ownership: "maintained",
    authority: "provider_reported",
};
const OPENCODE_ZEN_BUDGET_ACCOUNTING = {
    resultType: "budget",
    acquisitionMethod: "dashboard_scrape",
    ownership: "maintained",
    authority: "locally_derived",
};
export const opencodeZenProvider = {
    id: "opencode",
    async isAvailable(_ctx) {
        const config = await resolveOpenCodeZenConfigCached({
            maxAgeMs: DEFAULT_OPENCODE_ZEN_CONFIG_CACHE_MAX_AGE_MS,
        });
        return config.state === "configured";
    },
    matchesCurrentModel(model) {
        const [provider] = model.toLowerCase().split("/", 2);
        return normalizeQuotaProviderId(provider) === "opencode";
    },
    async fetch(ctx) {
        const diagnostics = await getOpenCodeZenConfigDiagnostics();
        const statusDetails = configStatusDetails({
            ...diagnostics,
            error: diagnostics.error ? sanitizeDisplayText(diagnostics.error) : undefined,
        });
        const config = await resolveOpenCodeZenConfigCached({
            maxAgeMs: DEFAULT_OPENCODE_ZEN_CONFIG_CACHE_MAX_AGE_MS,
        });
        if (config.state === "none")
            return withStatusDetails(notAttemptedResult(), statusDetails);
        if (config.state === "incomplete") {
            return withStatusDetails(attemptedErrorResult(OPENCODE_PROVIDER_LABEL, `Missing ${config.missing} (source: ${config.source})`), statusDetails);
        }
        if (config.state === "invalid") {
            return withStatusDetails(attemptedErrorResult(OPENCODE_PROVIDER_LABEL, `Invalid config (${config.source}): ${config.error}`), statusDetails);
        }
        const result = await queryOpenCodeZenQuota(config.config.workspaceId, config.config.authCookie, {
            requestTimeoutMs: ctx.config?.requestTimeoutMsConfigured
                ? ctx.config.requestTimeoutMs
                : undefined,
        });
        if (!result.success) {
            return withStatusDetails(attemptedErrorResult(OPENCODE_PROVIDER_LABEL, result.error), [
                ...statusDetails,
                { key: "live_fetch_error", value: result.error },
            ]);
        }
        const balanceUsd = result.data.balance / OPENCODE_ZEN_BILLING_UNITS_PER_DOLLAR;
        const configuredMonthlyLimit = ctx.config?.opencodeMonthlyLimit;
        const effectiveMonthlyLimit = configuredMonthlyLimit ?? result.data.monthlyLimit;
        const monthlyUsageUsd = result.data.monthlyUsage === null
            ? null
            : result.data.monthlyUsage / OPENCODE_ZEN_BILLING_UNITS_PER_DOLLAR;
        const entry = effectiveMonthlyLimit !== null &&
            Number.isFinite(effectiveMonthlyLimit) &&
            effectiveMonthlyLimit > 0 &&
            monthlyUsageUsd !== null &&
            Number.isFinite(monthlyUsageUsd) &&
            monthlyUsageUsd >= 0
            ? {
                accounting: OPENCODE_ZEN_BUDGET_ACCOUNTING,
                name: "",
                group: OPENCODE_ZEN_GROUP,
                percentRemaining: Math.min(100, Math.max(0, ((effectiveMonthlyLimit - monthlyUsageUsd) / effectiveMonthlyLimit) * 100)),
            }
            : {
                accounting: OPENCODE_ZEN_BALANCE_ACCOUNTING,
                kind: "value",
                name: "",
                group: OPENCODE_ZEN_GROUP,
                value: `$${balanceUsd.toFixed(2)}`,
            };
        return withStatusDetails(attemptedResult([entry]), [
            ...statusDetails,
            { key: "balance_usd", value: `$${balanceUsd.toFixed(2)}` },
            {
                key: "monthly_limit_usd",
                value: result.data.monthlyLimit === null ? "(none)" : `$${result.data.monthlyLimit.toFixed(2)}`,
            },
            {
                key: "last_payment_usd",
                value: result.data.lastPayment === null ? "(none)" : `$${result.data.lastPayment.toFixed(2)}`,
            },
        ]);
    },
};
//# sourceMappingURL=opencode-zen.js.map