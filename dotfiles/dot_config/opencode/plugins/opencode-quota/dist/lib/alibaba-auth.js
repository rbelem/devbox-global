import { extractProviderOptionsApiKey, getApiKeyCheckedPaths, getGlobalOpencodeConfigCandidatePaths, resolveApiKeyFromEnvAndConfig, } from "./api-key-resolver.js";
import { sanitizeDisplayText } from "./display-sanitize.js";
import { getAuthPaths, readAuthFileCached } from "./opencode-auth.js";
export const DEFAULT_ALIBABA_AUTH_CACHE_MAX_AGE_MS = 5_000;
const ALIBABA_AUTH_KEYS = ["alibaba-coding-plan", "alibaba"];
const ALIBABA_PROVIDER_KEYS = ["alibaba-coding-plan", "alibaba"];
const ALLOWED_ALIBABA_ENV_VARS = ["ALIBABA_CODING_PLAN_API_KEY", "ALIBABA_API_KEY"];
const DEFAULT_ALIBABA_CODING_PLAN_TIER = "lite";
export { getGlobalOpencodeConfigCandidatePaths as getOpencodeConfigCandidatePaths } from "./api-key-resolver.js";
function getFirstString(obj, keys) {
    for (const key of keys) {
        const value = obj[key];
        if (typeof value !== "string")
            continue;
        const trimmed = value.trim();
        if (trimmed)
            return trimmed;
    }
    return undefined;
}
function normalizeAlibabaTier(value) {
    const normalized = value?.trim().toLowerCase();
    if (!normalized)
        return null;
    if (normalized === "lite")
        return "lite";
    if (normalized === "pro" || normalized === "professional")
        return "pro";
    return null;
}
function asRecord(value) {
    return value !== null && typeof value === "object" ? value : null;
}
function getAlibabaAuthEntry(auth) {
    const root = asRecord(auth);
    if (!root)
        return undefined;
    for (const key of ALIBABA_AUTH_KEYS) {
        if (Object.hasOwn(root, key)) {
            return root[key];
        }
    }
    return undefined;
}
function isAlibabaAuthData(value) {
    return value !== null && typeof value === "object";
}
function sanitizeAlibabaAuthValue(value) {
    const sanitized = sanitizeDisplayText(value).replace(/\s+/g, " ").trim();
    return (sanitized || "unknown").slice(0, 120);
}
export function resolveAlibabaCodingPlanAuth(auth, fallbackTier = DEFAULT_ALIBABA_CODING_PLAN_TIER) {
    const alibaba = getAlibabaAuthEntry(auth);
    if (alibaba === undefined) {
        return { state: "none" };
    }
    if (!isAlibabaAuthData(alibaba)) {
        return { state: "invalid", error: "Alibaba Coding Plan auth entry has invalid shape" };
    }
    if (typeof alibaba.type !== "string") {
        return {
            state: "invalid",
            error: "Alibaba Coding Plan auth entry present but type is missing or invalid",
        };
    }
    if (alibaba.type !== "api") {
        return {
            state: "invalid",
            error: `Unsupported Alibaba Coding Plan auth type: "${sanitizeAlibabaAuthValue(alibaba.type)}"`,
        };
    }
    const apiKey = typeof alibaba.key === "string" ? alibaba.key.trim() : "";
    if (!apiKey) {
        return { state: "invalid", error: "Alibaba Coding Plan auth entry present but key is empty" };
    }
    const rawTier = getFirstString(alibaba, [
        "tier",
        "planTier",
        "plan_tier",
        "subscriptionTier",
    ]);
    const tier = normalizeAlibabaTier(rawTier);
    if (!rawTier) {
        return {
            state: "configured",
            apiKey,
            tier: fallbackTier,
        };
    }
    if (!tier) {
        return {
            state: "invalid",
            error: `Unsupported Alibaba Coding Plan tier: ${sanitizeAlibabaAuthValue(rawTier)}`,
            rawTier,
        };
    }
    return {
        state: "configured",
        apiKey,
        tier,
    };
}
async function resolveAlibabaCodingPlanAuthWithSource(params) {
    const fallbackTier = params?.fallbackTier ?? DEFAULT_ALIBABA_CODING_PLAN_TIER;
    const resolvedFromEnvOrConfig = await resolveApiKeyFromEnvAndConfig({
        envVars: [
            {
                name: "ALIBABA_CODING_PLAN_API_KEY",
                source: "env:ALIBABA_CODING_PLAN_API_KEY",
            },
            { name: "ALIBABA_API_KEY", source: "env:ALIBABA_API_KEY" },
        ],
        extractFromConfig: (config) => extractProviderOptionsApiKey(config, {
            providerKeys: ALIBABA_PROVIDER_KEYS,
            allowedEnvVars: ALLOWED_ALIBABA_ENV_VARS,
        }),
        configJsonSource: "opencode.json",
        configJsoncSource: "opencode.jsonc",
        getConfigCandidates: getGlobalOpencodeConfigCandidatePaths,
    });
    if (resolvedFromEnvOrConfig) {
        return {
            auth: {
                state: "configured",
                apiKey: resolvedFromEnvOrConfig.key,
                tier: fallbackTier,
            },
            source: resolvedFromEnvOrConfig.source,
        };
    }
    const maxAgeMs = Math.max(0, params?.maxAgeMs ?? DEFAULT_ALIBABA_AUTH_CACHE_MAX_AGE_MS);
    const authData = await readAuthFileCached({
        maxAgeMs,
    });
    const auth = resolveAlibabaCodingPlanAuth(authData, fallbackTier);
    return {
        auth,
        source: auth.state === "none" ? null : "auth.json",
    };
}
export async function resolveAlibabaCodingPlanAuthCached(params) {
    return (await resolveAlibabaCodingPlanAuthWithSource(params)).auth;
}
export async function getAlibabaCodingPlanAuthDiagnostics(params) {
    const { auth, source } = await resolveAlibabaCodingPlanAuthWithSource(params);
    const checkedPaths = getApiKeyCheckedPaths({
        envVarNames: [...ALLOWED_ALIBABA_ENV_VARS],
        getConfigCandidates: getGlobalOpencodeConfigCandidatePaths,
    });
    const authPaths = getAuthPaths();
    if (auth.state === "none") {
        return {
            state: "none",
            source: null,
            checkedPaths,
            authPaths,
        };
    }
    if (auth.state === "invalid") {
        return {
            state: "invalid",
            source: "auth.json",
            checkedPaths,
            authPaths,
            error: auth.error,
            rawTier: auth.rawTier,
        };
    }
    return {
        state: "configured",
        source: source ?? "auth.json",
        checkedPaths,
        authPaths,
        tier: auth.tier,
    };
}
export function hasAlibabaAuth(auth) {
    return resolveAlibabaCodingPlanAuth(auth).state === "configured";
}
export function isAlibabaModelId(model) {
    if (typeof model !== "string")
        return false;
    const normalized = model.toLowerCase();
    return normalized.startsWith("alibaba/") || normalized.startsWith("alibaba-cn/");
}
//# sourceMappingURL=alibaba-auth.js.map