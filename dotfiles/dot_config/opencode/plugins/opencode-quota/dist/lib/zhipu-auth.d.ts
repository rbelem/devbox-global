import type { InvalidAwareAuthDiagnostics, InvalidAwareAuthResult } from "./api-key-resolver.js";
import type { AuthData } from "./types.js";
export declare const DEFAULT_ZHIPU_AUTH_CACHE_MAX_AGE_MS = 5000;
export type ZhipuKeySource = "env:ZHIPU_API_KEY" | "env:ZHIPU_CODING_PLAN_API_KEY" | "opencode.json" | "opencode.jsonc" | "auth.json";
export type ResolvedZhipuAuth = InvalidAwareAuthResult;
export type ZhipuAuthDiagnostics = InvalidAwareAuthDiagnostics<ZhipuKeySource, "auth.json">;
export { getGlobalOpencodeConfigCandidatePaths as getOpencodeConfigCandidatePaths } from "./api-key-resolver.js";
export declare function resolveZhipuAuth(auth: AuthData | null | undefined): ResolvedZhipuAuth;
export declare function resolveZhipuAuthCached(params?: {
    maxAgeMs?: number;
}): Promise<ResolvedZhipuAuth>;
export declare function getZhipuAuthDiagnostics(params?: {
    maxAgeMs?: number;
}): Promise<ZhipuAuthDiagnostics>;
//# sourceMappingURL=zhipu-auth.d.ts.map