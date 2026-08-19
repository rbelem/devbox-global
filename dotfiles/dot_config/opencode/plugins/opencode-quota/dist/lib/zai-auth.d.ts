import type { InvalidAwareAuthDiagnostics, InvalidAwareAuthResult } from "./api-key-resolver.js";
import type { AuthData } from "./types.js";
export declare const DEFAULT_ZAI_AUTH_CACHE_MAX_AGE_MS = 5000;
export type ZaiKeySource = "env:ZAI_API_KEY" | "env:ZAI_CODING_PLAN_API_KEY" | "opencode.json" | "opencode.jsonc" | "auth.json";
export type ResolvedZaiAuth = InvalidAwareAuthResult;
export type ZaiAuthDiagnostics = InvalidAwareAuthDiagnostics<ZaiKeySource, "auth.json">;
export { getGlobalOpencodeConfigCandidatePaths as getOpencodeConfigCandidatePaths } from "./api-key-resolver.js";
export declare function resolveZaiAuth(auth: AuthData | null | undefined): ResolvedZaiAuth;
export declare function resolveZaiAuthCached(params?: {
    maxAgeMs?: number;
}): Promise<ResolvedZaiAuth>;
export declare function getZaiAuthDiagnostics(params?: {
    maxAgeMs?: number;
}): Promise<ZaiAuthDiagnostics>;
//# sourceMappingURL=zai-auth.d.ts.map