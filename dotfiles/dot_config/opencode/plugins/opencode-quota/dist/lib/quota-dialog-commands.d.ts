import type { RuntimeContextRootHints } from "./config-file-utils.js";
import { type QuotaStatusLiveProbe, type SessionModelMeta } from "./quota-render-data.js";
import { type QuotaRuntimeClient, type QuotaRuntimeContext } from "./quota-runtime-context.js";
import { type SessionTokenError } from "./quota-status.js";
import type { PricingSnapshotSource } from "./types.js";
export type QuotaDialogCommandId = "quota" | "quota_status" | "quota_announcements" | "pricing_refresh" | TokenReportCommandId;
export type QuotaDialogCommandSpec = {
    id: QuotaDialogCommandId;
    slashName: string;
    title: string;
    description: string;
    dialogSize: "medium" | "large" | "xlarge";
    requiresSession?: boolean;
    acceptsArguments?: boolean;
};
export type QuotaDialogCommandOutputResult = {
    state: "output";
    command: QuotaDialogCommandId;
    title: string;
    output: string;
    dialogSize: "medium" | "large" | "xlarge";
} | {
    state: "noop";
    command: QuotaDialogCommandId;
    reason: "disabled";
};
type TokenReportCommandId = "tokens_today" | "tokens_daily" | "tokens_weekly" | "tokens_monthly" | "tokens_all" | "tokens_session" | "tokens_session_all" | "tokens_between";
export declare const QUOTA_DIALOG_COMMANDS: readonly QuotaDialogCommandSpec[];
export declare function isQuotaDialogCommand(command: string): command is QuotaDialogCommandId;
export interface QuotaStatusReportConfigPayload {
    configSource: string;
    configPaths: string[];
    globalConfigPaths?: string[];
    workspaceConfigPaths?: string[];
    enabledProviders: string[] | "auto";
    onlyCurrentModel: boolean;
    pricingSnapshotSource: PricingSnapshotSource;
}
export interface QuotaStatusReportPricingPayload {
    selection: PricingSnapshotSource;
    activeSource: string;
    snapshot: {
        source: string;
        generatedAt: string | null;
        units: string;
    };
    snapshotPath: string;
    refreshStatePath: string;
}
export interface QuotaStatusReportPayload {
    version: string;
    generatedAt: string;
    config: QuotaStatusReportConfigPayload;
    providers: Array<{
        id: string;
        enabled: boolean;
        available: boolean;
        matchesCurrentModel?: boolean;
    }>;
    pricing: QuotaStatusReportPricingPayload;
    liveProbes: Array<{
        id: string;
        ok: boolean;
    }>;
}
export interface QuotaStatusReportData {
    output: string | null;
    payload: QuotaStatusReportPayload | null;
    hasComparableProviderData: boolean;
}
export declare function summarizeQuotaStatusLiveProbes(probes: QuotaStatusLiveProbe[]): QuotaStatusReportPayload["liveProbes"];
export declare function buildStatusReportData(params: {
    runtime: QuotaRuntimeContext;
    refreshGoogleTokens?: boolean;
    skewMs?: number;
    force?: boolean;
    sessionID?: string;
    generatedAtMs: number;
    lastSessionTokenError?: SessionTokenError;
    log?: (message: string, extra?: Record<string, unknown>) => Promise<void>;
    onDetectedProviderIds?: (providerIds: string[]) => Promise<void>;
    /** When set, restrict provider availability and live probes to this provider id. */
    providerFilterId?: string;
}): Promise<QuotaStatusReportData>;
export declare function buildQuotaDialogCommandOutput(params: {
    command: QuotaDialogCommandId;
    arguments?: string;
    client: QuotaRuntimeClient;
    roots: RuntimeContextRootHints;
    sessionID?: string;
    sessionMeta?: SessionModelMeta;
    resolveSessionMeta?: (sessionID: string) => Promise<SessionModelMeta>;
    generatedAtMs?: number;
    lastSessionTokenError?: SessionTokenError;
    setLastSessionTokenError?: (error: SessionTokenError | undefined) => void;
    log?: (message: string, extra?: Record<string, unknown>) => Promise<void>;
    onDetectedProviderIds?: (providerIds: string[]) => Promise<void>;
}): Promise<QuotaDialogCommandOutputResult>;
export {};
//# sourceMappingURL=quota-dialog-commands.d.ts.map