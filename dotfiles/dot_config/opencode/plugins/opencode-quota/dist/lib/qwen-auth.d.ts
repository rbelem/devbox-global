import type { AuthData } from "./types.js";
export declare const DEFAULT_QWEN_AUTH_CACHE_MAX_AGE_MS = 5000;
declare const QWEN_AUTH_KEYS: readonly ["qwen-code", "opencode-qwencode-auth"];
export type QwenOAuthSourceKey = (typeof QWEN_AUTH_KEYS)[number];
export type ResolvedQwenLocalPlan = {
    state: "none";
} | {
    state: "qwen_free";
    accessToken: string;
    sourceKey: QwenOAuthSourceKey;
};
export declare function hasQwenOAuthAuth(auth: AuthData | null | undefined): boolean;
export declare function hasQwenOAuthAuthCached(params?: {
    maxAgeMs?: number;
}): Promise<boolean>;
export declare function resolveQwenLocalPlan(auth: AuthData | null | undefined): ResolvedQwenLocalPlan;
export declare function resolveQwenLocalPlanCached(params?: {
    maxAgeMs?: number;
}): Promise<ResolvedQwenLocalPlan>;
export declare function isQwenCodeModelId(model?: string): boolean;
export {};
//# sourceMappingURL=qwen-auth.d.ts.map