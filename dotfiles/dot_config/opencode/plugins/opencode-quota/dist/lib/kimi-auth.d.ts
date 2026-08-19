import type { InvalidAwareAuthDiagnostics, InvalidAwareAuthResult } from "./api-key-resolver.js";
import type { AuthData } from "./types.js";
export declare const DEFAULT_KIMI_AUTH_CACHE_MAX_AGE_MS = 5000;
export type KimiKeySource = "env:KIMI_API_KEY" | "env:KIMI_CODE_API_KEY" | "opencode.json" | "opencode.jsonc" | "auth.json";
export type ResolvedKimiAuth = InvalidAwareAuthResult;
export type KimiAuthDiagnostics = InvalidAwareAuthDiagnostics<KimiKeySource, "auth.json">;
export { getGlobalOpencodeConfigCandidatePaths as getOpencodeConfigCandidatePaths } from "./api-key-resolver.js";
export declare function resolveKimiAuth(auth: AuthData | null | undefined): ResolvedKimiAuth;
export declare function resolveKimiAuthCached(params?: {
    maxAgeMs?: number;
}): Promise<ResolvedKimiAuth>;
export declare function getKimiAuthDiagnostics(params?: {
    maxAgeMs?: number;
}): Promise<KimiAuthDiagnostics>;
//# sourceMappingURL=kimi-auth.d.ts.map