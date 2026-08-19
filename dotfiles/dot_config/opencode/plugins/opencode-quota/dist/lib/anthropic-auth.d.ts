/**
 * OpenCode-managed Anthropic OAuth credentials.
 *
 * Reads the `anthropic` OAuth entry from OpenCode's own auth.json. This is the
 * credential OpenCode refreshes for Anthropic subscription models, so it stays
 * usable even when a separately installed Claude Code has stale credentials.
 */
import type { AuthData } from "./types.js";
export declare const DEFAULT_ANTHROPIC_AUTH_CACHE_MAX_AGE_MS = 5000;
export type ResolvedAnthropicOAuth = {
    state: "none";
} | {
    state: "expired";
    expiresAt: number;
} | {
    state: "configured";
    accessToken: string;
    expiresAt?: number;
};
export declare function resolveAnthropicOAuth(auth: AuthData | null | undefined, options?: {
    nowMs?: number;
}): ResolvedAnthropicOAuth;
export declare function resolveAnthropicOAuthCached(params?: {
    maxAgeMs?: number;
}): Promise<ResolvedAnthropicOAuth>;
//# sourceMappingURL=anthropic-auth.d.ts.map