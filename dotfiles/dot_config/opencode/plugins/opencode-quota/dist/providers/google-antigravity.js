/**
 * Google Antigravity provider wrapper.
 */
import { stat } from "fs/promises";
import { sanitizeDisplayText } from "../lib/display-sanitize.js";
import { hasAntigravityQuotaRuntimeAvailable, inspectAntigravityAccountsPresence, queryGoogleQuota, } from "../lib/google.js";
import { inspectAntigravityCompanionPresence } from "../lib/google-antigravity-companion.js";
import { getGoogleTokenCachePath } from "../lib/google-token-cache.js";
import { parseProviderModelRef } from "../lib/provider-model-matching.js";
import { createGoogleAccountLabelMap, formatGoogleAccountErrors, formatGoogleAccountLabel, } from "./google-account-format.js";
import { attemptedErrorResult, attemptedResult, notAttemptedResult, statusDetailsFromRecord, withStatusDetails, } from "./result-helpers.js";
const GOOGLE_ANTIGRAVITY_LABEL = "Antigravity";
async function isAccountsConfigured() {
    try {
        return await hasAntigravityQuotaRuntimeAvailable();
    }
    catch {
        return false;
    }
}
export const googleAntigravityProvider = {
    id: "google-antigravity",
    async isAvailable(_ctx) {
        // Google quota depends on both the accounts file and the separately
        // installed companion auth plugin.
        return await isAccountsConfigured();
    },
    matchesCurrentModel(model) {
        const { providerId, modelId } = parseProviderModelRef(model.trim());
        if (providerId === "google-antigravity" || providerId === "antigravity")
            return true;
        if (providerId === "google")
            return modelId.startsWith("antigravity-");
        return modelId.length === 0 && providerId.startsWith("antigravity-");
    },
    async fetch(ctx) {
        const [auth, companion] = await Promise.all([
            inspectAntigravityAccountsPresence(),
            inspectAntigravityCompanionPresence(),
        ]);
        const tokenCachePath = getGoogleTokenCachePath();
        const tokenCacheExists = await stat(tokenCachePath).then(() => true, () => false);
        const statusDetails = statusDetailsFromRecord({
            auth_state: auth.state,
            selected_accounts_path: auth.selectedPath ?? "(none)",
            present_accounts_paths: auth.presentPaths.join(" | ") || "(none)",
            candidate_accounts_paths: auth.candidatePaths.join(" | ") || "(none)",
            account_count: String(auth.accountCount),
            valid_account_count: String(auth.validAccountCount),
            companion_package_state: companion.state,
            companion_package_path: companion.state === "present" || companion.state === "invalid"
                ? (companion.resolvedPath ?? "(none)")
                : "(none)",
            companion_error: companion.state !== "present" ? sanitizeDisplayText(companion.error) : undefined,
            token_cache_path: `${tokenCachePath} exists=${tokenCacheExists ? "true" : "false"}`,
            auth_error: auth.state === "invalid" && auth.error ? sanitizeDisplayText(auth.error) : undefined,
        });
        const modelIds = ctx.config.googleModels;
        const result = await queryGoogleQuota(modelIds, {
            requestTimeoutMs: ctx.config?.requestTimeoutMs,
        });
        if (!result) {
            return withStatusDetails(notAttemptedResult(), statusDetails);
        }
        if (!result.success) {
            return withStatusDetails(attemptedErrorResult("Antigravity", result.error), statusDetails);
        }
        const accountLabels = createGoogleAccountLabelMap([
            ...result.models.map((model) => model.accountEmail),
            ...(result.errors ?? []).map((error) => error.email),
        ], "fixedGmailHint");
        const modelIdsByAccount = new Map();
        const returnedModelIds = new Set();
        for (const model of result.models) {
            const accountModelIds = modelIdsByAccount.get(model.accountEmail) ?? new Set();
            accountModelIds.add(model.modelId);
            modelIdsByAccount.set(model.accountEmail, accountModelIds);
            returnedModelIds.add(model.modelId);
        }
        const redundantQuotaFamily = result.models.length > 0 &&
            returnedModelIds.size === 1 &&
            [...modelIdsByAccount.values()].every((modelIds) => modelIds.size === 1)
            ? result.models[0].displayName
            : undefined;
        const entries = result.models.map((m) => {
            const accountLabel = m.accountEmail
                ? (accountLabels.get(m.accountEmail) ??
                    formatGoogleAccountLabel(m.accountEmail, "fixedGmailHint"))
                : "";
            const accountSuffix = accountLabel ? ` (${accountLabel})` : "";
            const group = `[${GOOGLE_ANTIGRAVITY_LABEL}${accountSuffix}]`;
            return {
                accounting: {
                    resultType: "quota",
                    acquisitionMethod: "remote_api",
                    ownership: "maintained",
                    authority: "provider_reported",
                    ...(m.accountEmail ? { sourceId: m.accountEmail } : {}),
                },
                name: `${GOOGLE_ANTIGRAVITY_LABEL}${accountSuffix}: ${m.displayName}`,
                group,
                label: `${m.displayName}:`,
                metricLabel: m.displayName,
                percentRemaining: m.percentRemaining,
                resetTimeIso: m.resetTimeIso,
            };
        });
        return withStatusDetails(attemptedResult(entries, formatGoogleAccountErrors(result.errors, "fixedGmailHint", accountLabels), {
            classicStrategy: "preserve",
            ...(redundantQuotaFamily ? { redundantQuotaFamily } : {}),
        }), statusDetails);
    },
};
//# sourceMappingURL=google-antigravity.js.map