/**
 * MiniMax auth resolver
 *
 * Resolves MiniMax credentials from trusted env vars, trusted user/global
 * OpenCode config, and auth.json fallback into the standardized shape used
 * by the MiniMax Coding Plan providers.
 */
import type { MiniMaxQuotaEndpointId } from "./minimax-endpoints.js";
import type { AuthData } from "./types.js";
export declare const DEFAULT_MINIMAX_AUTH_CACHE_MAX_AGE_MS = 5000;
export type MiniMaxKeySource = "env:MINIMAX_CHINA_CODING_PLAN_API_KEY" | "env:MINIMAX_CODING_PLAN_API_KEY" | "env:MINIMAX_API_KEY" | "opencode.json" | "opencode.jsonc" | "auth.json";
type MiniMaxInvalidSource = "opencode.json" | "opencode.jsonc" | "auth.json";
export type ResolvedMiniMaxAuth = {
    state: "none";
} | {
    state: "configured";
    apiKey: string;
    endpoint: MiniMaxQuotaEndpointId;
} | {
    state: "invalid";
    error: string;
};
export type MiniMaxAuthDiagnostics = {
    state: "none";
    source: null;
    checkedPaths: string[];
    authPaths: string[];
} | {
    state: "configured";
    source: MiniMaxKeySource;
    endpoint: MiniMaxQuotaEndpointId;
    checkedPaths: string[];
    authPaths: string[];
} | {
    state: "invalid";
    source: MiniMaxInvalidSource;
    checkedPaths: string[];
    authPaths: string[];
    error: string;
};
export { getGlobalOpencodeConfigCandidatePaths as getOpencodeConfigCandidatePaths } from "./api-key-resolver.js";
/**
 * Resolve international MiniMax auth from the full auth data.
 */
export declare function resolveMiniMaxAuth(auth: AuthData | null | undefined): ResolvedMiniMaxAuth;
/**
 * Resolve MiniMax China auth from the full auth data.
 */
export declare function resolveMiniMaxChinaAuth(auth: AuthData | null | undefined): ResolvedMiniMaxAuth;
export declare function resolveMiniMaxAuthCached(params?: {
    maxAgeMs?: number;
}): Promise<ResolvedMiniMaxAuth>;
export declare function resolveMiniMaxChinaAuthCached(params?: {
    maxAgeMs?: number;
}): Promise<ResolvedMiniMaxAuth>;
export declare function getMiniMaxAuthDiagnostics(params?: {
    maxAgeMs?: number;
}): Promise<MiniMaxAuthDiagnostics>;
export declare function getMiniMaxChinaAuthDiagnostics(params?: {
    maxAgeMs?: number;
}): Promise<MiniMaxAuthDiagnostics>;
//# sourceMappingURL=minimax-auth.d.ts.map