/**
 * GitHub Copilot accounting fetcher.
 *
 * Current usage is read from GitHub's public AI Credit billing reports.
 * Legacy premium-request reports are available only when explicitly selected
 * for an eligible Copilot Pro or Pro+ annual plan.
 */
import type { AuthData, CopilotBillingModel, CopilotQuotaConfig, CopilotResult } from "./types.js";
type CopilotAuthKeyName = "github-copilot" | "copilot" | "copilot-chat" | "github-copilot-chat";
type CopilotPatTokenKind = "github_pat" | "ghp" | "ghu" | "ghs" | "other";
type EffectiveCopilotAuthSource = "pat" | "oauth" | "none";
type CopilotQuotaApi = "github_ai_credit_api" | "github_legacy_premium_request_api" | "github_billing_api" | "copilot_internal_user" | "none";
type CopilotBillingMode = "user_quota" | "organization_usage" | "enterprise_usage" | "none";
type CopilotRemainingTotalsState = "available" | "value_only_without_denominator" | "not_available_from_org_usage" | "not_available_from_enterprise_usage" | "reported_by_copilot_internal_user" | "unavailable";
type CopilotDeployment = "github.com" | "ghe.com" | "invalid" | "none";
type CopilotEnterpriseHostSource = "pat" | "oauth" | "none";
interface BillingPeriodQuery {
    year: number;
    month: number;
}
export type CopilotPatState = "absent" | "invalid" | "valid";
export interface CopilotPatReadResult {
    state: CopilotPatState;
    checkedPaths: string[];
    selectedPath?: string;
    config?: CopilotQuotaConfig;
    error?: string;
    tokenKind?: CopilotPatTokenKind;
}
export interface CopilotQuotaAuthDiagnostics {
    pat: CopilotPatReadResult;
    oauth: {
        configured: boolean;
        keyName: CopilotAuthKeyName | null;
        hasRefreshToken: boolean;
        hasAccessToken: boolean;
        hasEnterpriseUrl: boolean;
    };
    deployment: CopilotDeployment;
    apiHost: string | null;
    enterpriseHostSource: CopilotEnterpriseHostSource;
    enterpriseHostError?: string;
    effectiveSource: EffectiveCopilotAuthSource;
    override: "pat_overrides_oauth" | "none";
    quotaApi: CopilotQuotaApi;
    billingMode: CopilotBillingMode;
    billingScope: "user" | "organization" | "enterprise" | "none";
    billingApiAccessLikely: boolean;
    remainingTotalsState: CopilotRemainingTotalsState;
    queryPeriod?: BillingPeriodQuery;
    usernameFilter?: string;
    billingTargetError?: string;
    tokenCompatibilityError?: string;
    billingModel?: CopilotBillingModel;
    budgetApi: "organization_budgets" | "enterprise_budgets" | "not_available";
    oauthAccountingState: "available_via_copilot_internal_user" | "invalid_enterprise_host" | "not_configured";
}
export declare function getCopilotPatConfigCandidatePaths(): string[];
export declare function readQuotaConfigWithMeta(): CopilotPatReadResult;
export declare function getCopilotQuotaAuthDiagnostics(authData: AuthData | null): CopilotQuotaAuthDiagnostics;
/**
 * Query GitHub Copilot accounting.
 *
 * A trusted local PAT config remains authoritative. When it is absent, the
 * OpenCode-managed Copilot OAuth token can query the per-user internal quota endpoint.
 */
export declare function queryCopilotQuota(options?: {
    requestTimeoutMs?: number;
}): Promise<CopilotResult>;
export declare function hasCopilotQuotaRuntimeAvailable(): Promise<boolean>;
export declare function formatCopilotQuota(result: CopilotResult): string | null;
export {};
//# sourceMappingURL=copilot.d.ts.map