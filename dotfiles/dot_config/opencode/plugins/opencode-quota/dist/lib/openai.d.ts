/**
 * OpenAI (ChatGPT) quota fetcher
 *
 * Uses OpenCode's auth.json native OpenCode OAuth entries and queries:
 * https://chatgpt.com/backend-api/wham/usage
 */
import type { AuthData, QuotaError } from "./types.js";
type OpenAIWindowValue = {
    percentRemaining: number;
    resetTimeIso?: string;
};
export declare const DEFAULT_OPENAI_AUTH_CACHE_MAX_AGE_MS = 5000;
export declare const OPENAI_AUTH_SOURCE_KEYS: readonly ["openai", "codex", "chatgpt", "opencode"];
export type OpenAIAuthSourceKey = (typeof OPENAI_AUTH_SOURCE_KEYS)[number];
export type OpenAIResult = {
    success: true;
    label: string;
    email?: string;
    windows: {
        hourly?: OpenAIWindowValue;
        weekly?: OpenAIWindowValue;
        monthly?: OpenAIWindowValue;
        codeReview?: OpenAIWindowValue;
    };
    credits?: {
        hasCredits: boolean;
        unlimited: boolean;
        balance: string | null;
    };
} | QuotaError | null;
export type ResolvedOpenAIOAuth = {
    state: "none";
} | {
    state: "configured";
    sourceKey: OpenAIAuthSourceKey;
    accessToken: string;
    refreshToken?: string;
    expiresAt?: number;
    email?: string;
    accountId?: string;
};
export declare function resolveOpenAIOAuth(auth: AuthData | null | undefined): ResolvedOpenAIOAuth;
export declare function hasOpenAIOAuth(auth: AuthData | null | undefined): boolean;
export declare function hasOpenAIOAuthCached(params?: {
    maxAgeMs?: number;
}): Promise<boolean>;
export declare function queryOpenAIQuota(options?: {
    requestTimeoutMs?: number;
}): Promise<OpenAIResult>;
export {};
//# sourceMappingURL=openai.d.ts.map