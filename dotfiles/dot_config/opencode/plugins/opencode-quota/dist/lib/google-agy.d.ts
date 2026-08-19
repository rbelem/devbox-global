import type { AuthData, GoogleAgyAuthSourceKey, GoogleAgyResult } from "./types.js";
export declare const DEFAULT_AGY_AUTH_CACHE_MAX_AGE_MS = 5000;
export declare const AGY_AUTH_KEYS: readonly ["google-agy", "opencode-agy-auth", "google-agy-auth"];
type RefreshParts = {
    refreshToken: string;
    projectId?: string;
    managedProjectId?: string;
};
export type AgyAccount = {
    sourceKey: GoogleAgyAuthSourceKey;
    refreshToken: string;
    projectId: string;
    email?: string;
    accessToken?: string;
    expiresAt?: number;
};
export type AgyAuthPresence = {
    state: "missing";
    sourceKey?: undefined;
    accountCount: 0;
    validAccountCount: 0;
} | {
    state: "present";
    sourceKey: GoogleAgyAuthSourceKey;
    accountCount: number;
    validAccountCount: number;
} | {
    state: "invalid";
    sourceKey?: GoogleAgyAuthSourceKey;
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
export declare function parseAgyRefreshParts(refresh: string | undefined): RefreshParts;
export declare function resolveAgyAccounts(auth: AuthData | null | undefined, configuredProjectId?: string): AgyAccount[];
export declare function resolveAgyConfiguredProjectId(client?: ConfigClient): Promise<string | undefined>;
export declare function inspectAgyAuthPresence(client?: ConfigClient): Promise<AgyAuthPresence>;
export declare function hasAgyQuotaRuntimeAvailable(client?: ConfigClient): Promise<boolean>;
export declare function formatDisplayName(modelId: string): string;
export declare function queryGoogleAgyQuota(client?: ConfigClient, options?: {
    requestTimeoutMs?: number;
}): Promise<GoogleAgyResult>;
export declare function clearAgyRuntimeCacheForTests(): void;
export {};
//# sourceMappingURL=google-agy.d.ts.map