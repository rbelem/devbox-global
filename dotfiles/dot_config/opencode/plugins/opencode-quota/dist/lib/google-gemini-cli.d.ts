import type { AuthData, GeminiCliAuthSourceKey, GeminiCliResult } from "./types.js";
export declare const DEFAULT_GEMINI_CLI_AUTH_CACHE_MAX_AGE_MS = 5000;
type RefreshParts = {
    refreshToken: string;
    projectId?: string;
    managedProjectId?: string;
};
export type GeminiCliAccount = {
    sourceKey: GeminiCliAuthSourceKey;
    refreshToken: string;
    projectId: string;
    email?: string;
    accessToken?: string;
    expiresAt?: number;
};
export type GeminiCliAuthPresence = {
    state: "missing";
    sourceKey?: undefined;
    accountCount: 0;
    validAccountCount: 0;
} | {
    state: "present";
    sourceKey: GeminiCliAuthSourceKey;
    accountCount: number;
    validAccountCount: number;
} | {
    state: "invalid";
    sourceKey?: GeminiCliAuthSourceKey;
    accountCount: number;
    validAccountCount: number;
    error: string;
};
type ConfigClient = {
    config?: {
        get?: () => Promise<{
            data?: unknown;
        }>;
    };
};
export declare function parseGeminiCliRefreshParts(refresh: string | undefined): RefreshParts;
export declare function resolveGeminiCliAccounts(auth: AuthData | null | undefined, configuredProjectId?: string): GeminiCliAccount[];
export declare function resolveGeminiCliConfiguredProjectId(client?: ConfigClient): Promise<string | undefined>;
export declare function inspectGeminiCliAuthPresence(client?: ConfigClient): Promise<GeminiCliAuthPresence>;
export declare function hasGeminiCliQuotaRuntimeAvailable(client?: ConfigClient): Promise<boolean>;
export declare function queryGeminiCliQuota(client?: ConfigClient, options?: {
    requestTimeoutMs?: number;
}): Promise<GeminiCliResult>;
export declare function clearGeminiCliRuntimeCacheForTests(): void;
export {};
//# sourceMappingURL=google-gemini-cli.d.ts.map