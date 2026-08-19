import type { LoadConfigMeta } from "./config.js";
import { loadConfig } from "./config.js";
import type { RuntimeContextRootHints, RuntimeContextRoots } from "./config-file-utils.js";
import type { QuotaProvider, QuotaProviderContext } from "./entries.js";
import { type RuntimeProviderIdResolver } from "./runtime-provider-ids.js";
import type { QuotaToastConfig } from "./types.js";
export type QuotaRuntimeClient = NonNullable<Parameters<typeof loadConfig>[0]> & QuotaProviderContext["client"];
export interface QuotaSessionModelContext {
    modelID?: string;
    providerID?: string;
}
export interface ResolveQuotaRuntimeContextParams {
    client: QuotaRuntimeClient;
    roots: RuntimeContextRootHints;
    config?: QuotaToastConfig;
    sessionID?: string;
    sessionMeta?: QuotaSessionModelContext;
    resolveSessionMeta?: (sessionID: string) => Promise<QuotaSessionModelContext>;
    includeSessionMeta?: boolean | ((config: QuotaToastConfig) => boolean);
    configMeta?: LoadConfigMeta;
    providers?: QuotaProvider[];
    configureTelemetry?: boolean;
}
export interface QuotaRuntimeContext {
    client: QuotaRuntimeClient;
    roots: RuntimeContextRoots;
    config: QuotaToastConfig;
    configMeta: LoadConfigMeta;
    providers: QuotaProvider[];
    resolveRuntimeProviderIds: RuntimeProviderIdResolver;
    session: {
        sessionID?: string;
        sessionMeta?: QuotaSessionModelContext;
    };
}
export declare function shouldIncludeSessionMeta(params: {
    config: QuotaToastConfig;
    includeSessionMeta?: ResolveQuotaRuntimeContextParams["includeSessionMeta"];
}): boolean;
export declare function resolveQuotaRuntimeContext(params: ResolveQuotaRuntimeContextParams): Promise<QuotaRuntimeContext>;
export declare function createQuotaRuntimeRequestContext(runtime: Pick<QuotaRuntimeContext, "session">): {
    sessionID?: string;
    sessionMeta?: QuotaSessionModelContext;
};
export declare function createQuotaProviderRuntimeContext(runtime: {
    client: QuotaRuntimeClient;
    config: QuotaToastConfig;
    session: QuotaRuntimeContext["session"];
    resolveRuntimeProviderIds: RuntimeProviderIdResolver;
    configMeta?: Pick<LoadConfigMeta, "settingSources">;
    configureTelemetry?: boolean;
}): QuotaProviderContext;
//# sourceMappingURL=quota-runtime-context.d.ts.map