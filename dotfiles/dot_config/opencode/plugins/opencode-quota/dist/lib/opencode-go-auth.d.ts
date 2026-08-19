import type { InvalidAwareAuthDiagnostics, InvalidAwareAuthResult } from "./api-key-resolver.js";
export declare const DEFAULT_OPENCODE_GO_AUTH_CACHE_MAX_AGE_MS = 5000;
export type OpenCodeGoKeySource = "env:OPENCODE_API_KEY" | "opencode.json" | "opencode.jsonc" | "auth.json";
export type ResolvedOpenCodeGoAuth = InvalidAwareAuthResult;
export type OpenCodeGoAuthDiagnostics = InvalidAwareAuthDiagnostics<OpenCodeGoKeySource, "auth.json">;
export { getGlobalOpencodeConfigCandidatePaths as getOpencodeConfigCandidatePaths } from "./api-key-resolver.js";
export declare function resolveOpenCodeGoAuth(auth: unknown): ResolvedOpenCodeGoAuth;
export declare function resolveOpenCodeGoAuthCached(params?: {
    maxAgeMs?: number;
}): Promise<ResolvedOpenCodeGoAuth>;
export declare function getOpenCodeGoAuthDiagnostics(params?: {
    maxAgeMs?: number;
}): Promise<OpenCodeGoAuthDiagnostics>;
//# sourceMappingURL=opencode-go-auth.d.ts.map