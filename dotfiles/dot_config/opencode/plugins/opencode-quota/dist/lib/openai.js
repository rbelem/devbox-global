/**
 * OpenAI (ChatGPT) quota fetcher
 *
 * Uses OpenCode's auth.json native OpenCode OAuth entries and queries:
 * https://chatgpt.com/backend-api/wham/usage
 */
import { sanitizeDisplaySnippet, sanitizeDisplayText } from "./display-sanitize.js";
import { clampPercent } from "./format-utils.js";
import { fetchWithTimeout } from "./http.js";
import { readAuthFileCached } from "./opencode-auth.js";
function base64UrlDecode(input) {
    const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
    const padLen = (4 - (base64.length % 4)) % 4;
    const padded = base64 + "=".repeat(padLen);
    return Buffer.from(padded, "base64").toString("utf8");
}
function parseJwt(token) {
    try {
        const parts = token.split(".");
        if (parts.length !== 3)
            return null;
        return JSON.parse(base64UrlDecode(parts[1]));
    }
    catch {
        return null;
    }
}
function getEmailFromJwt(token) {
    return parseJwt(token)?.["https://api.openai.com/profile"]?.email ?? null;
}
function getAccountIdFromJwt(token) {
    return parseJwt(token)?.["https://api.openai.com/auth"]?.chatgpt_account_id ?? null;
}
const WINDOW_KIND_BY_DURATION = {
    18000: "hourly",
    604800: "weekly",
    2628000: "monthly",
};
function isoFromMilliseconds(milliseconds) {
    if (!Number.isFinite(milliseconds) || milliseconds <= 0)
        return undefined;
    const date = new Date(milliseconds);
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}
function resetIsoFromNowSeconds(seconds) {
    if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds <= 0) {
        return undefined;
    }
    return isoFromMilliseconds(Date.now() + Math.round(seconds * 1000));
}
function resetIsoFromResetAt(resetAt) {
    if (typeof resetAt !== "number" || !Number.isFinite(resetAt) || resetAt <= 0) {
        return undefined;
    }
    return isoFromMilliseconds(Math.round(resetAt * 1000));
}
function parseWindowValue(window) {
    if (!window || typeof window !== "object")
        return null;
    const value = window;
    if (typeof value.used_percent !== "number" || !Number.isFinite(value.used_percent)) {
        return null;
    }
    return {
        percentRemaining: clampPercent(100 - value.used_percent),
        resetTimeIso: resetIsoFromResetAt(value.reset_at) ?? resetIsoFromNowSeconds(value.reset_after_seconds),
    };
}
function parseRemainingWindowValue(window) {
    if (!window || typeof window !== "object")
        return null;
    const value = window;
    if (typeof value.remaining_percent !== "number" || !Number.isFinite(value.remaining_percent)) {
        return null;
    }
    return {
        percentRemaining: clampPercent(value.remaining_percent),
        resetTimeIso: resetIsoFromResetAt(value.reset_at) ?? resetIsoFromNowSeconds(value.reset_after_seconds),
    };
}
function parseRateLimitWindow(window) {
    if (!window || typeof window !== "object")
        return null;
    const raw = window;
    if (typeof raw.limit_window_seconds !== "number" || !Number.isFinite(raw.limit_window_seconds)) {
        return null;
    }
    const kind = WINDOW_KIND_BY_DURATION[raw.limit_window_seconds];
    if (!kind)
        return null;
    const value = parseWindowValue(window);
    return value ? { kind, value } : null;
}
function derivePlanLabel(planType) {
    const normalized = (planType ?? "").trim().toLowerCase();
    if (normalized === "team" || normalized === "business")
        return "OpenAI (Business)";
    if (normalized.includes("pro"))
        return "OpenAI (Pro)";
    if (normalized.includes("plus"))
        return "OpenAI (Plus)";
    if (planType)
        return `OpenAI (${planType})`;
    return "OpenAI";
}
const OPENAI_USAGE_URL = "https://chatgpt.com/backend-api/wham/usage";
export const DEFAULT_OPENAI_AUTH_CACHE_MAX_AGE_MS = 5_000;
export const OPENAI_AUTH_SOURCE_KEYS = ["openai", "codex", "chatgpt", "opencode"];
function getOpenAIOAuthEntry(auth) {
    for (const sourceKey of OPENAI_AUTH_SOURCE_KEYS) {
        const entry = auth?.[sourceKey];
        if (!entry || entry.type !== "oauth") {
            continue;
        }
        const accessToken = typeof entry.access === "string" ? entry.access.trim() : "";
        if (accessToken) {
            return { sourceKey, entry, accessToken };
        }
    }
    return null;
}
export function resolveOpenAIOAuth(auth) {
    const resolved = getOpenAIOAuthEntry(auth);
    if (!resolved) {
        return { state: "none" };
    }
    const email = getEmailFromJwt(resolved.accessToken) ?? undefined;
    const accountId = getAccountIdFromJwt(resolved.accessToken) ?? resolved.entry.accountId ?? undefined;
    return {
        state: "configured",
        sourceKey: resolved.sourceKey,
        accessToken: resolved.accessToken,
        refreshToken: typeof resolved.entry.refresh === "string" && resolved.entry.refresh.trim()
            ? resolved.entry.refresh
            : undefined,
        expiresAt: typeof resolved.entry.expires === "number" ? resolved.entry.expires : undefined,
        email,
        accountId,
    };
}
export function hasOpenAIOAuth(auth) {
    return resolveOpenAIOAuth(auth).state === "configured";
}
export async function hasOpenAIOAuthCached(params) {
    const auth = await readAuthFileCached({
        maxAgeMs: Math.max(0, params?.maxAgeMs ?? DEFAULT_OPENAI_AUTH_CACHE_MAX_AGE_MS),
    });
    return hasOpenAIOAuth(auth);
}
export async function queryOpenAIQuota(options = {}) {
    const auth = await readAuthFileCached({
        maxAgeMs: DEFAULT_OPENAI_AUTH_CACHE_MAX_AGE_MS,
    });
    const resolvedAuth = resolveOpenAIOAuth(auth);
    if (resolvedAuth.state !== "configured")
        return null;
    if (resolvedAuth.expiresAt && resolvedAuth.expiresAt < Date.now()) {
        return { success: false, error: "Token expired" };
    }
    try {
        const headers = {
            Authorization: `Bearer ${resolvedAuth.accessToken}`,
            "User-Agent": "OpenCode-Quota-Toast/1.0",
        };
        const accountId = resolvedAuth.accountId;
        if (accountId) {
            headers["ChatGPT-Account-Id"] = accountId;
        }
        return await fetchWithTimeout(OPENAI_USAGE_URL, {
            request: { headers },
            timeoutMs: options.requestTimeoutMs,
            consume: async (resp) => {
                if (!resp.ok) {
                    const text = await resp.text();
                    return {
                        success: false,
                        error: `OpenAI API error ${resp.status}: ${sanitizeDisplaySnippet(text, 120)}`,
                    };
                }
                const data = (await resp.json());
                const primary = parseRateLimitWindow(data.rate_limit?.primary_window);
                const secondary = parseRateLimitWindow(data.rate_limit?.secondary_window);
                const individualLimit = parseRemainingWindowValue(data.spend_control?.individual_limit);
                const codeReview = parseWindowValue(data.code_review_rate_limit?.primary_window);
                const credits = data.credits ?? null;
                const windows = {};
                const conflictingKinds = new Set();
                for (const parsed of [primary, secondary]) {
                    if (!parsed || conflictingKinds.has(parsed.kind))
                        continue;
                    const existing = windows[parsed.kind];
                    if (!existing) {
                        windows[parsed.kind] = parsed.value;
                    }
                    else if (existing.percentRemaining !== parsed.value.percentRemaining ||
                        existing.resetTimeIso !== parsed.value.resetTimeIso) {
                        delete windows[parsed.kind];
                        conflictingKinds.add(parsed.kind);
                    }
                }
                if (!windows.monthly && individualLimit)
                    windows.monthly = individualLimit;
                if (codeReview)
                    windows.codeReview = codeReview;
                if (Object.keys(windows).length === 0) {
                    return { success: false, error: "No quota data" };
                }
                return {
                    success: true,
                    label: derivePlanLabel(data.plan_type),
                    email: resolvedAuth.email,
                    windows,
                    credits: credits
                        ? {
                            hasCredits: Boolean(credits.has_credits),
                            unlimited: Boolean(credits.unlimited),
                            balance: credits.balance ?? null,
                        }
                        : undefined,
                };
            },
        });
    }
    catch (err) {
        return {
            success: false,
            error: sanitizeDisplayText(err instanceof Error ? err.message : String(err)),
        };
    }
}
//# sourceMappingURL=openai.js.map