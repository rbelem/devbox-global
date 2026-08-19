import { clearGeminiCliCompanionCacheForTests as clearGeminiCliCompanionResolutionCacheForTests, inspectGeminiCliCompanionPresence, resolveGeminiCliClientCredentials, } from "./google-gemini-cli-companion.js";
import { getCachedAccessToken, makeAccountCacheKey, setCachedAccessToken, } from "./google-token-cache.js";
import { fetchWithTimeout } from "./http.js";
import { mapWithConcurrency } from "./map-with-concurrency.js";
import { readAuthFileCached } from "./opencode-auth.js";
export const DEFAULT_GEMINI_CLI_AUTH_CACHE_MAX_AGE_MS = 5_000;
const GEMINI_CLI_AUTH_KEYS = [
    "google-gemini-cli",
    "gemini-cli",
    "opencode-gemini-auth",
    "gemini",
    "google",
];
const GEMINI_TOKEN_REFRESH_URL = "https://oauth2.googleapis.com/token";
const GEMINI_QUOTA_API_URL = "https://cloudcode-pa.googleapis.com/v1internal:retrieveUserQuota";
const GEMINI_TOKEN_TIMEOUT_MS = 8_000;
const GEMINI_QUOTA_TIMEOUT_MS = 6_000;
const GEMINI_ACCOUNTS_CONCURRENCY = 3;
const GEMINI_CLI_USER_AGENT = `GeminiCLI/opencode-quota (${process.platform}; ${process.arch})`;
function normalizeString(value) {
    if (typeof value !== "string") {
        return undefined;
    }
    const trimmed = value.trim();
    return trimmed || undefined;
}
export function parseGeminiCliRefreshParts(refresh) {
    const [refreshToken = "", projectId = "", managedProjectId = ""] = (refresh ?? "").split("|");
    return {
        refreshToken: refreshToken.trim(),
        ...(normalizeString(projectId) ? { projectId: projectId.trim() } : {}),
        ...(normalizeString(managedProjectId) ? { managedProjectId: managedProjectId.trim() } : {}),
    };
}
function getAuthEntry(auth, sourceKey) {
    return auth[sourceKey];
}
function resolveEmail(entry) {
    return (normalizeString(entry.email) ??
        normalizeString(entry.accountEmail) ??
        normalizeString(entry.login));
}
function resolveProjectId(entry, parts, configuredProjectId) {
    return (normalizeString(entry.managedProjectId) ??
        normalizeString(entry.quotaProjectId) ??
        parts.managedProjectId ??
        normalizeString(entry.projectId) ??
        normalizeString(entry.projectID) ??
        parts.projectId ??
        normalizeString(configuredProjectId));
}
export function resolveGeminiCliAccounts(auth, configuredProjectId) {
    if (!auth) {
        return [];
    }
    const accounts = [];
    const seen = new Set();
    for (const sourceKey of GEMINI_CLI_AUTH_KEYS) {
        const entry = getAuthEntry(auth, sourceKey);
        if (!entry || entry.type !== "oauth") {
            continue;
        }
        const parts = parseGeminiCliRefreshParts(entry.refresh);
        if (!parts.refreshToken) {
            continue;
        }
        const projectId = resolveProjectId(entry, parts, configuredProjectId);
        if (!projectId) {
            continue;
        }
        const email = resolveEmail(entry);
        const key = `${parts.refreshToken}\n${projectId}`;
        if (seen.has(key)) {
            continue;
        }
        seen.add(key);
        accounts.push({
            sourceKey,
            refreshToken: parts.refreshToken,
            projectId,
            ...(email ? { email } : {}),
            ...(normalizeString(entry.access) ? { accessToken: entry.access.trim() } : {}),
            ...(typeof entry.expires === "number" ? { expiresAt: entry.expires } : {}),
        });
    }
    return accounts;
}
function countGeminiCliAuthEntries(auth) {
    if (!auth) {
        return 0;
    }
    return GEMINI_CLI_AUTH_KEYS.reduce((count, sourceKey) => {
        const entry = getAuthEntry(auth, sourceKey);
        return entry && entry.type === "oauth" ? count + 1 : count;
    }, 0);
}
function firstGeminiCliAuthKey(auth) {
    if (!auth) {
        return undefined;
    }
    return GEMINI_CLI_AUTH_KEYS.find((sourceKey) => getAuthEntry(auth, sourceKey)?.type === "oauth");
}
function getCompanionQuotaError(state) {
    return state === "missing"
        ? "Gemini CLI requires the opencode-gemini-auth plugin"
        : "Installed opencode-gemini-auth package is incompatible";
}
export async function resolveGeminiCliConfiguredProjectId(client) {
    const explicitEnvProjectId = normalizeString(process.env.OPENCODE_GEMINI_PROJECT_ID);
    if (explicitEnvProjectId) {
        return explicitEnvProjectId;
    }
    if (client?.config?.get) {
        try {
            const result = await client.config.get();
            const data = result?.data;
            const configProjectId = normalizeString(data?.provider?.google?.options?.projectId);
            if (configProjectId) {
                return configProjectId;
            }
        }
        catch {
            // ignore and fall back to generic Google project env vars below
        }
    }
    return (normalizeString(process.env.GOOGLE_CLOUD_PROJECT) ??
        normalizeString(process.env.GOOGLE_CLOUD_PROJECT_ID));
}
export async function inspectGeminiCliAuthPresence(client) {
    const [auth, configuredProjectId] = await Promise.all([
        readAuthFileCached({ maxAgeMs: DEFAULT_GEMINI_CLI_AUTH_CACHE_MAX_AGE_MS }),
        resolveGeminiCliConfiguredProjectId(client),
    ]);
    const accountCount = countGeminiCliAuthEntries(auth);
    if (accountCount === 0) {
        return { state: "missing", accountCount: 0, validAccountCount: 0 };
    }
    const accounts = resolveGeminiCliAccounts(auth, configuredProjectId);
    const sourceKey = accounts[0]?.sourceKey ?? firstGeminiCliAuthKey(auth);
    if (accounts.length === 0) {
        return {
            state: "invalid",
            ...(sourceKey ? { sourceKey } : {}),
            accountCount,
            validAccountCount: 0,
            error: "Gemini CLI OAuth auth is missing a refresh token or project id",
        };
    }
    return {
        state: "present",
        sourceKey: accounts[0].sourceKey,
        accountCount,
        validAccountCount: accounts.length,
    };
}
export async function hasGeminiCliQuotaRuntimeAvailable(client) {
    const [authPresence, companionPresence] = await Promise.all([
        inspectGeminiCliAuthPresence(client),
        inspectGeminiCliCompanionPresence(),
    ]);
    return (authPresence.state === "present" &&
        authPresence.validAccountCount > 0 &&
        companionPresence.state === "present");
}
async function refreshAccessToken(params) {
    try {
        return await fetchWithTimeout(GEMINI_TOKEN_REFRESH_URL, {
            request: {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({
                    client_id: params.clientId,
                    client_secret: params.clientSecret,
                    refresh_token: params.refreshToken,
                    grant_type: "refresh_token",
                }),
            },
            timeoutMs: params.timeoutMs ?? GEMINI_TOKEN_TIMEOUT_MS,
            consume: async (response, timeoutSignal) => {
                if (!response.ok) {
                    try {
                        const errorData = (await response.json());
                        if (errorData.error === "invalid_grant") {
                            return { error: "Token revoked" };
                        }
                        return { error: errorData.error_description || `HTTP ${response.status}` };
                    }
                    catch (error) {
                        if (timeoutSignal.aborted)
                            throw error;
                        return { error: `HTTP ${response.status}` };
                    }
                }
                const data = (await response.json());
                return {
                    accessToken: data.access_token,
                    expiresIn: data.expires_in,
                };
            },
        });
    }
    catch (err) {
        if (err instanceof Error && err.message.includes("timeout")) {
            return { error: "Token refresh timeout" };
        }
        return { error: "Token refresh failed" };
    }
}
async function refreshGeminiCliAccessTokenWithCache(params) {
    const skewMs = params.skewMs ?? 2 * 60_000;
    const key = makeAccountCacheKey({
        refreshToken: params.account.refreshToken,
        projectId: params.account.projectId,
        email: params.account.email,
    });
    if (!params.force) {
        const cached = await getCachedAccessToken({ key, skewMs });
        if (cached)
            return { accessToken: cached.accessToken };
        if (params.account.accessToken &&
            typeof params.account.expiresAt === "number" &&
            params.account.expiresAt > Date.now() + skewMs) {
            return { accessToken: params.account.accessToken };
        }
    }
    const refreshed = await refreshAccessToken({
        refreshToken: params.account.refreshToken,
        clientId: params.credentials.clientId,
        clientSecret: params.credentials.clientSecret,
        timeoutMs: params.timeoutMs,
    });
    if ("error" in refreshed)
        return refreshed;
    await setCachedAccessToken({
        key,
        entry: {
            accessToken: refreshed.accessToken,
            expiresAt: Date.now() + Math.max(1, refreshed.expiresIn) * 1000,
            projectId: params.account.projectId,
            email: params.account.email,
        },
    });
    return { accessToken: refreshed.accessToken };
}
async function retrieveGeminiCliQuota(accessToken, projectId, timeoutMs = GEMINI_QUOTA_TIMEOUT_MS) {
    return await fetchWithTimeout(GEMINI_QUOTA_API_URL, {
        request: {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
                "User-Agent": GEMINI_CLI_USER_AGENT,
            },
            body: JSON.stringify({ project: projectId }),
        },
        timeoutMs,
        consume: async (response) => {
            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    throw new Error(`Gemini CLI quota auth error: ${response.status}`);
                }
                throw new Error(`Gemini CLI quota API error: ${response.status}`);
            }
            return (await response.json());
        },
    });
}
function formatDisplayName(modelId) {
    const cleaned = modelId.replace(/_/g, "-").trim();
    if (!cleaned) {
        return "Gemini";
    }
    const words = cleaned
        .replace(/^gemini-/i, "")
        .split("-")
        .filter(Boolean)
        .map((part) => {
        if (/^[0-9]+(?:\.[0-9]+)*$/.test(part))
            return part;
        return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    });
    return words.length > 0 ? `Gemini ${words.join(" ")}` : "Gemini";
}
const GEMINI_CLI_QUALITY_TIERS = [
    { key: "pro", displayName: "Gemini Pro", order: 0 },
    { key: "flash", displayName: "Gemini Flash", order: 1 },
    { key: "flashLite", displayName: "Gemini Flash Lite", order: 2 },
];
function getGeminiCliQualityTier(modelId) {
    const normalized = modelId.toLowerCase().replace(/_/g, "-");
    const tokens = normalized.split(/[^a-z0-9]+/).filter(Boolean);
    if (normalized.includes("flash-lite") || (tokens.includes("flash") && tokens.includes("lite"))) {
        return GEMINI_CLI_QUALITY_TIERS[2];
    }
    if (tokens.includes("pro")) {
        return GEMINI_CLI_QUALITY_TIERS[0];
    }
    if (tokens.includes("flash")) {
        return GEMINI_CLI_QUALITY_TIERS[1];
    }
    return undefined;
}
function aggregateGeminiCliQualityTiers(buckets) {
    const groupedBuckets = new Map();
    const unknownBuckets = [];
    for (const bucket of buckets) {
        const tier = getGeminiCliQualityTier(bucket.modelId);
        if (!tier) {
            unknownBuckets.push(bucket);
            continue;
        }
        const candidate = { ...bucket, displayName: tier.displayName };
        const existing = groupedBuckets.get(tier.key);
        if (!existing || candidate.percentRemaining < existing.percentRemaining) {
            groupedBuckets.set(tier.key, candidate);
        }
    }
    return [
        ...GEMINI_CLI_QUALITY_TIERS.flatMap((tier) => {
            const bucket = groupedBuckets.get(tier.key);
            return bucket ? [bucket] : [];
        }),
        ...unknownBuckets,
    ];
}
function mapQuotaBuckets(buckets, account) {
    if (!buckets) {
        return [];
    }
    const normalizedBuckets = buckets
        .filter((bucket) => normalizeString(bucket.modelId))
        .map((bucket) => {
        const modelId = normalizeString(bucket.modelId);
        const remainingFraction = bucket.remainingFraction;
        const percentRemaining = typeof remainingFraction === "number" && Number.isFinite(remainingFraction)
            ? Math.round(remainingFraction * 100)
            : 0;
        return {
            modelId,
            displayName: formatDisplayName(modelId),
            percentRemaining,
            ...(normalizeString(bucket.resetTime) ? { resetTimeIso: bucket.resetTime.trim() } : {}),
            ...(normalizeString(bucket.remainingAmount)
                ? { remainingAmount: bucket.remainingAmount.trim() }
                : {}),
            ...(normalizeString(bucket.tokenType) ? { tokenType: bucket.tokenType.trim() } : {}),
            ...(account.email ? { accountEmail: account.email } : {}),
            sourceKey: account.sourceKey,
        };
    });
    return aggregateGeminiCliQualityTiers(normalizedBuckets);
}
async function fetchAccountQuota(params) {
    const accountEmail = params.account.email || params.account.sourceKey;
    try {
        const tokenResult = await refreshGeminiCliAccessTokenWithCache({
            account: params.account,
            credentials: params.credentials,
            timeoutMs: params.timeoutMs,
        });
        if ("error" in tokenResult) {
            return { success: false, error: tokenResult.error, accountEmail };
        }
        let quota;
        try {
            quota = await retrieveGeminiCliQuota(tokenResult.accessToken, params.account.projectId, params.timeoutMs);
        }
        catch (err) {
            if (err instanceof Error && err.message.includes("auth error")) {
                const retryToken = await refreshGeminiCliAccessTokenWithCache({
                    account: params.account,
                    credentials: params.credentials,
                    force: true,
                    timeoutMs: params.timeoutMs,
                });
                if ("error" in retryToken) {
                    return { success: false, error: retryToken.error, accountEmail };
                }
                quota = await retrieveGeminiCliQuota(retryToken.accessToken, params.account.projectId, params.timeoutMs);
            }
            else {
                throw err;
            }
        }
        return {
            success: true,
            buckets: mapQuotaBuckets(quota.buckets, params.account),
            accountEmail,
        };
    }
    catch (err) {
        if (err instanceof Error && err.message.includes("timeout")) {
            return { success: false, error: "API timeout", accountEmail };
        }
        return {
            success: false,
            error: err instanceof Error ? err.message : String(err),
            accountEmail,
        };
    }
}
export async function queryGeminiCliQuota(client, options = {}) {
    const [auth, configuredProjectId] = await Promise.all([
        readAuthFileCached({ maxAgeMs: DEFAULT_GEMINI_CLI_AUTH_CACHE_MAX_AGE_MS }),
        resolveGeminiCliConfiguredProjectId(client),
    ]);
    const accounts = resolveGeminiCliAccounts(auth, configuredProjectId);
    if (accounts.length === 0) {
        return null;
    }
    const credentials = await resolveGeminiCliClientCredentials();
    if (credentials.state !== "configured") {
        return {
            success: false,
            error: getCompanionQuotaError(credentials.state),
        };
    }
    const results = await mapWithConcurrency(accounts, GEMINI_ACCOUNTS_CONCURRENCY, async (account) => fetchAccountQuota({ account, credentials, timeoutMs: options.requestTimeoutMs }));
    const allBuckets = [];
    const errors = [];
    for (const result of results) {
        if (result.success && result.buckets && result.buckets.length > 0) {
            allBuckets.push(...result.buckets);
        }
        else if (!result.success && result.error && result.accountEmail) {
            errors.push({ email: result.accountEmail, error: result.error });
        }
    }
    if (allBuckets.length === 0 && errors.length === 0) {
        return {
            success: false,
            error: "No Gemini CLI quota data available",
        };
    }
    return {
        success: true,
        buckets: allBuckets,
        errors: errors.length > 0 ? errors : undefined,
    };
}
export function clearGeminiCliRuntimeCacheForTests() {
    clearGeminiCliCompanionResolutionCacheForTests();
}
//# sourceMappingURL=google-gemini-cli.js.map