/**
 * OpenCode-managed Anthropic OAuth credentials.
 *
 * Reads the `anthropic` OAuth entry from OpenCode's own auth.json. This is the
 * credential OpenCode refreshes for Anthropic subscription models, so it stays
 * usable even when a separately installed Claude Code has stale credentials.
 */
import { readAuthFileCached } from "./opencode-auth.js";
export const DEFAULT_ANTHROPIC_AUTH_CACHE_MAX_AGE_MS = 5_000;
export function resolveAnthropicOAuth(auth, options = {}) {
    const entry = auth?.anthropic;
    if (!entry || entry.type !== "oauth") {
        return { state: "none" };
    }
    const accessToken = typeof entry.access === "string" ? entry.access.trim() : "";
    if (!accessToken) {
        return { state: "none" };
    }
    const expiresAt = typeof entry.expires === "number" ? entry.expires : undefined;
    if (expiresAt !== undefined && expiresAt <= (options.nowMs ?? Date.now())) {
        return { state: "expired", expiresAt };
    }
    return expiresAt === undefined
        ? { state: "configured", accessToken }
        : { state: "configured", accessToken, expiresAt };
}
export async function resolveAnthropicOAuthCached(params) {
    const auth = await readAuthFileCached({
        maxAgeMs: Math.max(0, params?.maxAgeMs ?? DEFAULT_ANTHROPIC_AUTH_CACHE_MAX_AGE_MS),
    });
    return resolveAnthropicOAuth(auth);
}
//# sourceMappingURL=anthropic-auth.js.map