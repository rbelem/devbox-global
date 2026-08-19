import type { AlibabaCodingPlanTier, AuthData } from "./types.js";
export declare const DEFAULT_ALIBABA_AUTH_CACHE_MAX_AGE_MS = 5000;
export type AlibabaCodingPlanKeySource = "env:ALIBABA_CODING_PLAN_API_KEY" | "env:ALIBABA_API_KEY" | "opencode.json" | "opencode.jsonc" | "auth.json";
export type ResolvedAlibabaCodingPlanAuth = {
    state: "none";
} | {
    state: "configured";
    apiKey: string;
    tier: AlibabaCodingPlanTier;
} | {
    state: "invalid";
    error: string;
    rawTier?: string;
};
export type AlibabaCodingPlanAuthDiagnostics = {
    state: "none";
    source: null;
    checkedPaths: string[];
    authPaths: string[];
} | {
    state: "configured";
    source: AlibabaCodingPlanKeySource;
    checkedPaths: string[];
    authPaths: string[];
    tier: AlibabaCodingPlanTier;
} | {
    state: "invalid";
    source: "auth.json";
    checkedPaths: string[];
    authPaths: string[];
    error: string;
    rawTier?: string;
};
export { getGlobalOpencodeConfigCandidatePaths as getOpencodeConfigCandidatePaths } from "./api-key-resolver.js";
export declare function resolveAlibabaCodingPlanAuth(auth: AuthData | null | undefined, fallbackTier?: AlibabaCodingPlanTier): ResolvedAlibabaCodingPlanAuth;
export declare function resolveAlibabaCodingPlanAuthCached(params?: {
    maxAgeMs?: number;
    fallbackTier?: AlibabaCodingPlanTier;
}): Promise<ResolvedAlibabaCodingPlanAuth>;
export declare function getAlibabaCodingPlanAuthDiagnostics(params?: {
    maxAgeMs?: number;
    fallbackTier?: AlibabaCodingPlanTier;
}): Promise<AlibabaCodingPlanAuthDiagnostics>;
export declare function hasAlibabaAuth(auth: AuthData | null | undefined): boolean;
export declare function isAlibabaModelId(model?: string): boolean;
//# sourceMappingURL=alibaba-auth.d.ts.map