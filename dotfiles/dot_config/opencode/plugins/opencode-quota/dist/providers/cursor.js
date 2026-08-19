import { CURSOR_CANONICAL_PLUGIN_PACKAGE, inspectCursorAuthPresence, inspectCursorOpenCodeIntegration, } from "../lib/cursor-detection.js";
import { getCursorPlanDisplayName, getEffectiveCursorIncludedApiUsd, isCursorModelId, isCursorProviderId, } from "../lib/cursor-pricing.js";
import { getCurrentCursorUsageSummary } from "../lib/cursor-usage.js";
import { fmtUsdAmount } from "../lib/format-utils.js";
import { isCanonicalProviderAvailable } from "../lib/provider-availability.js";
import { attemptedResult, notAttemptedResult, statusDetailsFromRecord, withStatusDetails, } from "./result-helpers.js";
function buildCursorGroup(plan) {
    return plan ? `Cursor (${plan})` : "Cursor";
}
function buildCursorApiUsageValue(params) {
    const value = `${fmtUsdAmount(params.costUsd)}/${fmtUsdAmount(params.includedApiUsd)} used`;
    return params.partial ? `${value} (partial)` : value;
}
export const cursorProvider = {
    id: "cursor",
    async isAvailable(ctx) {
        const availableViaProviderConfig = await isCanonicalProviderAvailable({
            ctx,
            providerId: "cursor",
            fallbackOnError: false,
        });
        if (availableViaProviderConfig)
            return true;
        if (isCursorProviderId(ctx.config.currentProviderID))
            return true;
        if (isCursorModelId(ctx.config.currentModel))
            return true;
        const integration = await inspectCursorOpenCodeIntegration();
        return integration.pluginEnabled || integration.providerConfigured;
    },
    matchesCurrentModel(model) {
        return isCursorModelId(model);
    },
    async fetch(ctx) {
        const planLabel = getCursorPlanDisplayName(ctx.config.cursorPlan);
        const group = buildCursorGroup(planLabel);
        const includedApiUsd = getEffectiveCursorIncludedApiUsd({
            plan: ctx.config.cursorPlan,
            overrideUsd: ctx.config.cursorIncludedApiUsd,
        });
        const [usage, auth, integration] = await Promise.all([
            getCurrentCursorUsageSummary({
                billingCycleStartDay: ctx.config.cursorBillingCycleStartDay,
            }),
            inspectCursorAuthPresence(),
            inspectCursorOpenCodeIntegration(),
        ]);
        const formatUsage = (costUsd, messageCount) => `${fmtUsdAmount(costUsd)} across ${Math.trunc(messageCount).toLocaleString("en-US")} messages`;
        const statusDetails = statusDetailsFromRecord({
            plan: planLabel ?? "none",
            included_api_usd: typeof includedApiUsd === "number" ? fmtUsdAmount(includedApiUsd) : "(none)",
            billing_cycle_start_day: typeof ctx.config.cursorBillingCycleStartDay === "number"
                ? String(ctx.config.cursorBillingCycleStartDay)
                : "(calendar month)",
            auth_state: auth.state,
            auth_selected_path: auth.selectedPath ?? "(none)",
            auth_present_paths: auth.presentPaths.join(" | ") || "(none)",
            auth_candidate_paths: auth.candidatePaths.join(" | ") || "(none)",
            auth_error: auth.error,
            plugin_enabled: integration.pluginEnabled ? "true" : "false",
            canonical_plugin_package: CURSOR_CANONICAL_PLUGIN_PACKAGE,
            provider_configured: integration.providerConfigured ? "true" : "false",
            config_matches: integration.matchedPaths.join(" | ") || "(none)",
            config_checked_paths: integration.checkedPaths.join(" | ") || "(none)",
            cycle_source: usage.window.source,
            cycle_reset_at: usage.window.resetTimeIso,
            api_usage: formatUsage(usage.api.costUsd, usage.api.messageCount),
            auto_composer_usage: formatUsage(usage.autoComposer.costUsd, usage.autoComposer.messageCount),
            total_cursor_usage: formatUsage(usage.total.costUsd, usage.total.messageCount),
            unknown_cursor_models: Math.trunc(usage.unknownModels.length).toLocaleString("en-US"),
        });
        if (usage.total.messageCount === 0 && includedApiUsd === undefined) {
            return withStatusDetails(notAttemptedResult(), statusDetails);
        }
        const errors = usage.unknownModels.length > 0
            ? [
                {
                    label: "Cursor",
                    message: "Unknown Cursor model ids present in local history (see /quota_status)",
                },
            ]
            : [];
        const hasPartialApiCoverage = usage.unknownModels.length > 0;
        const entries = [];
        if (includedApiUsd !== undefined) {
            entries.push(hasPartialApiCoverage
                ? {
                    kind: "value",
                    accounting: {
                        resultType: "budget",
                        acquisitionMethod: "local_runtime_accounting",
                        ownership: "maintained",
                        authority: "locally_derived",
                    },
                    name: planLabel ? `Cursor API (${planLabel})` : "Cursor API",
                    group,
                    label: "API:",
                    value: buildCursorApiUsageValue({
                        costUsd: usage.api.costUsd,
                        includedApiUsd,
                        partial: true,
                    }),
                    resetTimeIso: usage.window.resetTimeIso,
                }
                : {
                    accounting: {
                        resultType: "budget",
                        acquisitionMethod: "local_runtime_accounting",
                        ownership: "maintained",
                        authority: "locally_derived",
                    },
                    name: planLabel ? `Cursor API (${planLabel})` : "Cursor API",
                    group,
                    label: "API:",
                    right: `${fmtUsdAmount(usage.api.costUsd)}/${fmtUsdAmount(includedApiUsd)}`,
                    percentRemaining: includedApiUsd > 0 ? 100 - (usage.api.costUsd / includedApiUsd) * 100 : 0,
                    resetTimeIso: usage.window.resetTimeIso,
                });
        }
        else {
            entries.push({
                kind: "value",
                accounting: {
                    resultType: "spend",
                    acquisitionMethod: "local_runtime_accounting",
                    ownership: "maintained",
                    authority: "locally_derived",
                },
                name: "Cursor",
                group,
                label: "Usage:",
                value: `${fmtUsdAmount(usage.total.costUsd)} used this cycle`,
                resetTimeIso: usage.window.resetTimeIso,
            });
        }
        if (usage.autoComposer.messageCount > 0 || includedApiUsd !== undefined) {
            entries.push({
                kind: "value",
                accounting: {
                    resultType: "spend",
                    acquisitionMethod: "local_runtime_accounting",
                    ownership: "maintained",
                    authority: "locally_derived",
                },
                name: "Cursor Auto+Composer",
                group,
                label: "Auto+Composer:",
                value: `${fmtUsdAmount(usage.autoComposer.costUsd)} used`,
                resetTimeIso: usage.window.resetTimeIso,
            });
        }
        return withStatusDetails(attemptedResult(entries, errors), statusDetails);
    },
};
//# sourceMappingURL=cursor.js.map