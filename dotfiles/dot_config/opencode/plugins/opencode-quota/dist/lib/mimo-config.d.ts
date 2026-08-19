export interface MimoConfig {
    cookie: string;
}
export type ResolvedMimoConfig = {
    state: "none";
} | {
    state: "configured";
    config: MimoConfig;
    source: string;
} | {
    state: "invalid";
    source: string;
    error: string;
};
export interface MimoConfigDiagnostics {
    state: ResolvedMimoConfig["state"];
    source: string | null;
    error: string | null;
    checkedPaths: string[];
}
export declare function normalizeMimoCookieHeader(raw: string): string | null;
export declare function resolveMimoConfigFromEnv(env?: NodeJS.ProcessEnv): ResolvedMimoConfig | null;
export declare function resolveMimoConfig(): Promise<ResolvedMimoConfig>;
export declare const DEFAULT_MIMO_CONFIG_CACHE_MAX_AGE_MS = 30000;
export declare function resolveMimoConfigCached(params?: {
    maxAgeMs?: number;
}): Promise<ResolvedMimoConfig>;
export declare function getMimoConfigDiagnostics(): Promise<MimoConfigDiagnostics>;
//# sourceMappingURL=mimo-config.d.ts.map