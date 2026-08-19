export interface OpenCodeZenConfig {
    workspaceId: string;
    authCookie: string;
}
export type ResolvedOpenCodeZenConfig = {
    state: "none";
} | {
    state: "configured";
    config: OpenCodeZenConfig;
    source: string;
} | {
    state: "incomplete";
    source: string;
    missing: string;
} | {
    state: "invalid";
    source: string;
    error: string;
};
export interface OpenCodeZenConfigDiagnostics {
    state: ResolvedOpenCodeZenConfig["state"];
    source: string | null;
    missing: string | null;
    error: string | null;
    checkedPaths: string[];
}
export declare function resolveOpenCodeZenConfigFromEnv(env?: NodeJS.ProcessEnv): ResolvedOpenCodeZenConfig | null;
export declare function resolveOpenCodeZenConfig(): Promise<ResolvedOpenCodeZenConfig>;
export declare const DEFAULT_OPENCODE_ZEN_CONFIG_CACHE_MAX_AGE_MS = 30000;
export declare function resolveOpenCodeZenConfigCached(params?: {
    maxAgeMs?: number;
}): Promise<ResolvedOpenCodeZenConfig>;
export declare function getOpenCodeZenConfigDiagnostics(): Promise<OpenCodeZenConfigDiagnostics>;
//# sourceMappingURL=opencode-zen-config.d.ts.map