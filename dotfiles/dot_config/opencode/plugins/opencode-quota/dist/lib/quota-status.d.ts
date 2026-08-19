import { type LoadConfigIssue, type QuotaToastSettingSources } from "./config.js";
import type { QuotaProviderResult } from "./entries.js";
import type { MaintainerAnnouncementsSummary } from "./maintainer-announcements.js";
import type { QuotaProviderDefinition } from "./quota-providers.js";
import type { CursorQuotaPlan, MaintainerAnnouncementsConfig, OpenCodeGoWindowKey, PricingSnapshotSource } from "./types.js";
/** Session token fetch error info for status report */
export interface SessionTokenError {
    sessionID: string;
    error: string;
    checkedPath?: string;
}
type ProviderLiveProbe = {
    providerId: string;
    result: QuotaProviderResult;
};
type ProviderAvailability = {
    id: string;
    enabled: boolean;
    available: boolean;
    matchesCurrentModel?: boolean;
};
export declare function buildQuotaStatusReport(params: {
    configSource: string;
    configPaths: string[];
    globalConfigPaths?: string[];
    workspaceConfigPaths?: string[];
    settingSources?: QuotaToastSettingSources;
    configIssues?: LoadConfigIssue[];
    tuiDiagnostics?: {
        workspaceRoot: string;
        configRoot: string;
        configured: boolean;
        inferredSelectedPath: string | null;
        presentPaths: string[];
        candidatePaths: string[];
        quotaPluginConfigured: boolean;
        quotaPluginConfigPaths: string[];
    };
    enabledProviders: string[] | "auto";
    googleModels: readonly string[];
    anthropicBinaryPath?: string;
    cursorPlan: CursorQuotaPlan;
    cursorIncludedApiUsd?: number;
    cursorBillingCycleStartDay?: number;
    opencodeGoWindows?: OpenCodeGoWindowKey[];
    pricingSnapshotSource: PricingSnapshotSource;
    onlyCurrentModel: boolean;
    currentModel?: string;
    /** Whether a session was available for model lookup */
    sessionModelLookup?: "ok" | "not_found" | "no_session";
    providerAvailability: ProviderAvailability[];
    providerLiveProbes?: ProviderLiveProbe[];
    quotaProviders?: readonly QuotaProviderDefinition[];
    googleRefresh?: {
        attempted: boolean;
        total?: number;
        successCount?: number;
        failures?: Array<{
            email?: string;
            error: string;
        }>;
    };
    sessionTokenError?: SessionTokenError;
    maintainerAnnouncements?: {
        config: MaintainerAnnouncementsConfig;
        summary: MaintainerAnnouncementsSummary;
    };
    generatedAtMs?: number;
}): Promise<string>;
export {};
//# sourceMappingURL=quota-status.d.ts.map