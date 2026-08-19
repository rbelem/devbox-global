import { findQuotaProviderDefinition } from "../lib/quota-providers.js";
import { DEFAULT_QWEN_AUTH_CACHE_MAX_AGE_MS, isQwenCodeModelId, resolveQwenLocalPlanCached, } from "../lib/qwen-auth.js";
import { computeQwenQuota, getQwenLocalQuotaPath, QWEN_LOCAL_QUOTA_STATE_VERSION, readQwenLocalQuotaState, } from "../lib/qwen-local-quota.js";
import { attemptedResult, inspectGeneratedCounterFile, notAttemptedResult, statusDetailsFromRecord, withStatusDetails, } from "./result-helpers.js";
export const qwenCodeProvider = {
    id: "qwen-code",
    async isAvailable(_ctx) {
        const plan = await resolveQwenLocalPlanCached({
            maxAgeMs: DEFAULT_QWEN_AUTH_CACHE_MAX_AGE_MS,
        });
        return plan.state === "qwen_free";
    },
    matchesCurrentModel(model, context) {
        return context?.currentProviderID
            ? context.currentProviderID === "qwen-code"
            : isQwenCodeModelId(model);
    },
    async fetch(ctx) {
        const plan = await resolveQwenLocalPlanCached({
            maxAgeMs: DEFAULT_QWEN_AUTH_CACHE_MAX_AGE_MS,
        });
        const statePath = getQwenLocalQuotaPath();
        const state = await inspectGeneratedCounterFile(statePath, QWEN_LOCAL_QUOTA_STATE_VERSION);
        const lastUpdate = state.lastUpdatedAt === null ? "(none)" : new Date(state.lastUpdatedAt).toISOString();
        const statusDetails = statusDetailsFromRecord({
            "qwen oauth auth configured": plan.state === "qwen_free" ? "true" : "false",
            qwen_oauth_source: plan.state === "qwen_free" ? plan.sourceKey : "(none)",
            qwen_local_plan: plan.state === "qwen_free" ? "qwen-code/free" : "(none)",
            "qwen free local quota": `path=${statePath} exists=${state.exists ? "true" : "false"} health=${state.health} version=${state.version ?? "(none)"} last_update=${lastUpdate}`,
            local_state_path: statePath,
            local_state_exists: state.exists ? "true" : "false",
            local_state_health: state.health,
            local_state_version: String(state.version ?? "(none)"),
            local_state_last_update: lastUpdate,
        });
        if (plan.state !== "qwen_free") {
            return withStatusDetails(notAttemptedResult(), statusDetails);
        }
        const tuning = findQuotaProviderDefinition(ctx.config.quotaProviders ?? [], "qwen-code");
        const daily = tuning?.mode === "local-estimate"
            ? tuning.windows.find((window) => window.id === "daily")
            : undefined;
        const rpm = tuning?.mode === "local-estimate"
            ? tuning.windows.find((window) => window.id === "rpm")
            : undefined;
        const quota = computeQwenQuota({
            state: await readQwenLocalQuotaState(),
            ...(daily ? { dayLimit: daily.requestLimit } : {}),
            ...(rpm ? { rpmLimit: rpm.requestLimit } : {}),
        });
        return withStatusDetails(attemptedResult([
            {
                accounting: {
                    resultType: "quota",
                    acquisitionMethod: "local_estimation",
                    ownership: "maintained",
                    authority: "locally_derived",
                },
                name: "Qwen Free Daily",
                group: "Qwen (free)",
                label: "Daily:",
                right: `${quota.day.used}/${quota.day.limit}`,
                percentRemaining: quota.day.percentRemaining,
                resetTimeIso: quota.day.resetTimeIso,
            },
            {
                accounting: {
                    resultType: "rate_limit",
                    acquisitionMethod: "local_estimation",
                    ownership: "maintained",
                    authority: "locally_derived",
                },
                name: "Qwen Free RPM",
                group: "Qwen (free)",
                label: "RPM:",
                right: `${quota.rpm.used}/${quota.rpm.limit}`,
                percentRemaining: quota.rpm.percentRemaining,
                resetTimeIso: quota.rpm.resetTimeIso,
            },
        ]), statusDetails);
    },
};
//# sourceMappingURL=qwen-code.js.map