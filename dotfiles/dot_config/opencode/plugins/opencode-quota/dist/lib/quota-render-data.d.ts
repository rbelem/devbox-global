import type { LoadConfigMeta } from "./config.js";
import type { QuotaProvider, QuotaProviderContext, QuotaProviderResult, QuotaToastEntry, QuotaToastError, SessionTokensData } from "./entries.js";
import type { QuotaFormatStyle } from "./quota-format-style.js";
import type { SessionTokenError } from "./quota-status.js";
import { type RuntimeProviderIdResolver } from "./runtime-provider-ids.js";
import type { QuotaToastConfig } from "./types.js";
export type SessionModelMeta = {
    modelID?: string;
    providerID?: string;
};
export type QuotaRequestContext = {
    sessionID?: string;
    sessionMeta?: SessionModelMeta;
};
export type QuotaRenderData = {
    entries: QuotaToastEntry[];
    errors: QuotaToastError[];
    sessionTokens?: SessionTokensData;
};
export type QuotaRenderSelection = {
    isAutoMode: boolean;
    providers: QuotaProvider[];
    filtered: QuotaProvider[];
    ctx: QuotaProviderContext;
    currentModel?: string;
    currentProviderID?: string;
    filteringByCurrentSelection: boolean;
    waitingForCurrentSelection: boolean;
};
export type QuotaAvailability = {
    provider: QuotaProvider;
    ok: boolean;
    error?: boolean;
};
export declare function collectConcreteEnabledProviderIds(params: {
    providers: QuotaProvider[];
    ctx: QuotaProviderContext;
    enabledProviders: string[] | "auto";
}): Promise<string[]>;
export type CollectQuotaRenderDataResult = {
    selection: QuotaRenderSelection | null;
    availability: QuotaAvailability[];
    active: QuotaProvider[];
    /** Unprojected provider results for stateful observers such as reset detection. */
    providerResults: QuotaStatusLiveProbe[];
    attemptedAny: boolean;
    hasExplicitProviderIssues: boolean;
    data: QuotaRenderData | null;
    allWindowsData?: QuotaRenderData | null;
    /** Pre-computed singleWindow-projected data. Only present when includeAllWindowsData=true and root style is allWindows. */
    singleWindowData?: QuotaRenderData | null;
    sessionTokenError?: SessionTokenError;
};
export type QuotaStatusLiveProbe = {
    providerId: string;
    result: QuotaProviderResult;
};
export declare function matchesQuotaProviderCurrentSelection(params: {
    provider: QuotaProvider;
    currentModel?: string;
    currentProviderID?: string;
    enabledProviders?: string[] | "auto";
    quotaProviders?: QuotaToastConfig["quotaProviders"];
}): boolean;
export declare function resolveQuotaRenderSelection(params: {
    client: QuotaProviderContext["client"];
    config: QuotaToastConfig;
    request?: QuotaRequestContext;
    configMeta?: Pick<LoadConfigMeta, "settingSources">;
    providers?: QuotaProvider[];
    resolveRuntimeProviderIds?: RuntimeProviderIdResolver;
}): Promise<QuotaRenderSelection | null>;
export declare function fetchProviderResults(params: {
    providers: QuotaProvider[];
    ctx: QuotaProviderContext;
    ttlMs: number;
    bypassCache?: boolean;
}): Promise<QuotaProviderResult[]>;
export declare function collectQuotaStatusLiveProbes(params: {
    client: QuotaProviderContext["client"];
    config: QuotaToastConfig;
    request?: QuotaRequestContext;
    configMeta?: Pick<LoadConfigMeta, "settingSources">;
    providers: QuotaProvider[];
    resolveRuntimeProviderIds?: RuntimeProviderIdResolver;
}): Promise<QuotaStatusLiveProbe[]>;
export declare function normalizeSingleWindowWindowLabel(value?: string): string | null;
export declare function collectQuotaRenderData(params: {
    client: QuotaProviderContext["client"];
    config: QuotaToastConfig;
    request?: QuotaRequestContext;
    surfaceExplicitProviderIssues: boolean;
    formatStyle?: QuotaFormatStyle;
    configMeta?: Pick<LoadConfigMeta, "settingSources">;
    bypassProviderCache?: boolean;
    providers?: QuotaProvider[];
    includeAllWindowsData?: boolean;
    resolveRuntimeProviderIds?: RuntimeProviderIdResolver;
}): Promise<CollectQuotaRenderDataResult>;
//# sourceMappingURL=quota-render-data.d.ts.map