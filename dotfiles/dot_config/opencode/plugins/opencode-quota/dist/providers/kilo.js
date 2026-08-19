/**
 * Kilo Gateway provider wrapper.
 */
import { fmtUsdAmount } from "../lib/format-utils.js";
import { queryKiloQuota } from "../lib/kilo.js";
import { getKiloKeyDiagnostics, hasKiloApiKey } from "../lib/kilo-config.js";
import { modelProviderMatchesRuntimeId } from "../lib/provider-model-matching.js";
import { attemptedResult, notAttemptedResult, simpleApiKeyStatusDetails, statusDetailsFromRecord, withStatusDetails, } from "./result-helpers.js";
const KILO_QUOTA_ACCOUNTING = {
    resultType: "quota",
    acquisitionMethod: "remote_api",
    ownership: "maintained",
    authority: "locally_derived",
};
const KILO_BALANCE_ACCOUNTING = {
    resultType: "balance",
    acquisitionMethod: "remote_api",
    ownership: "maintained",
    authority: "provider_reported",
};
function buildKiloPassEntries(state) {
    const totalCreditsUsd = state.baseCreditsUsd + state.bonusCreditsUsd;
    const entries = [];
    if (totalCreditsUsd > 0) {
        entries.push({
            accounting: KILO_QUOTA_ACCOUNTING,
            name: "Kilo Gateway Credits",
            group: "Kilo Gateway",
            label: "Credits:",
            metricLabel: "Credits",
            right: `${fmtUsdAmount(state.remainingUsd)} left`,
            percentRemaining: Math.min(100, Math.max(0, ((totalCreditsUsd - state.usageUsd) / totalCreditsUsd) * 100)),
            resetTimeIso: state.resetTimeIso,
        });
    }
    entries.push({
        kind: "value",
        accounting: KILO_QUOTA_ACCOUNTING,
        name: "Kilo Gateway Remaining Credits",
        group: "Kilo Gateway",
        label: "Left:",
        metricLabel: "Left",
        value: fmtUsdAmount(state.remainingUsd),
        ...(totalCreditsUsd === 0 && state.resetTimeIso ? { resetTimeIso: state.resetTimeIso } : {}),
    });
    return entries;
}
function mapKiloPassSuccess(state) {
    const rawDetails = statusDetailsFromRecord({
        base_credits_usd: fmtUsdAmount(state.baseCreditsUsd),
        usage_usd: fmtUsdAmount(state.usageUsd),
        bonus_credits_usd: fmtUsdAmount(state.bonusCreditsUsd),
        remaining_usd: fmtUsdAmount(state.remainingUsd),
        overage_usd: fmtUsdAmount(state.overageUsd),
        reset_at: state.resetTimeIso ?? "(none)",
    });
    return withStatusDetails({
        ...attemptedResult(buildKiloPassEntries(state), [], {
            singleWindowDisplayName: "Kilo Gateway",
            singleWindowShowRight: true,
        }),
        rawDetails,
    }, [...statusDetailsFromRecord({ accounting_mode: "kilo_pass" }), ...rawDetails]);
}
function mapKiloBalanceSuccess(state) {
    return withStatusDetails(attemptedResult([
        {
            kind: "value",
            accounting: KILO_BALANCE_ACCOUNTING,
            name: "Kilo Gateway Balance",
            group: "Kilo Gateway",
            label: "Balance:",
            value: fmtUsdAmount(state.balanceUsd),
        },
    ]), statusDetailsFromRecord({
        accounting_mode: "gateway_balance",
        balance_usd: fmtUsdAmount(state.balanceUsd),
    }));
}
export const kiloProvider = {
    id: "kilo",
    async isAvailable(_ctx) {
        return await hasKiloApiKey();
    },
    matchesCurrentModel(model) {
        return modelProviderMatchesRuntimeId(model, "kilo");
    },
    async fetch(ctx) {
        const diagnostics = await getKiloKeyDiagnostics().catch(() => ({
            configured: false,
            source: null,
            checkedPaths: [],
            authPaths: [],
        }));
        const stateResult = await queryKiloQuota({
            requestTimeoutMs: ctx.config?.requestTimeoutMs,
        });
        const keyStatusDetails = simpleApiKeyStatusDetails(diagnostics);
        if (!stateResult) {
            return withStatusDetails(notAttemptedResult(), keyStatusDetails);
        }
        if (!stateResult.success) {
            return withStatusDetails({
                attempted: true,
                entries: [],
                errors: [{ label: "Kilo Gateway", message: stateResult.error }],
            }, keyStatusDetails);
        }
        const providerResult = stateResult.mode === "kilo_pass"
            ? mapKiloPassSuccess(stateResult)
            : mapKiloBalanceSuccess(stateResult);
        return withStatusDetails(providerResult, [
            ...keyStatusDetails,
            ...(providerResult.statusDetails ?? []),
        ]);
    },
};
//# sourceMappingURL=kilo.js.map