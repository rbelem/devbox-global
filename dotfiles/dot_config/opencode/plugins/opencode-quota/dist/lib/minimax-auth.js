/**
 * MiniMax auth resolver
 *
 * Resolves MiniMax credentials from trusted env vars, trusted user/global
 * OpenCode config, and auth.json fallback into the standardized shape used
 * by the MiniMax Coding Plan providers.
 */
import { getApiKeyCheckedPaths, getFirstAuthEntryValue, getGlobalOpencodeConfigCandidatePaths, readOpencodeConfig, } from "./api-key-resolver.js";
import { sanitizeDisplayText } from "./display-sanitize.js";
import { resolveEnvTemplate } from "./env-template.js";
import { getAuthPaths, readAuthFileCached } from "./opencode-auth.js";
export const DEFAULT_MINIMAX_AUTH_CACHE_MAX_AGE_MS = 5_000;
export { getGlobalOpencodeConfigCandidatePaths as getOpencodeConfigCandidatePaths } from "./api-key-resolver.js";
const MINIMAX_AUTH_SPEC = {
    endpoint: "international",
    authKeys: ["minimax-coding-plan"],
    providerKeys: ["minimax-coding-plan", "minimax"],
    envVars: [
        { name: "MINIMAX_CODING_PLAN_API_KEY", source: "env:MINIMAX_CODING_PLAN_API_KEY" },
        { name: "MINIMAX_API_KEY", source: "env:MINIMAX_API_KEY" },
    ],
    allowedEnvVars: ["MINIMAX_CODING_PLAN_API_KEY", "MINIMAX_API_KEY"],
};
const MINIMAX_CHINA_AUTH_SPEC = {
    endpoint: "china",
    authKeys: ["minimax-china-coding-plan", "minimax-cn-coding-plan"],
    providerKeys: [
        "minimax-china-coding-plan",
        "minimax-cn-coding-plan",
        "minimax-cn",
        "minimax-china",
    ],
    envVars: [
        {
            name: "MINIMAX_CHINA_CODING_PLAN_API_KEY",
            source: "env:MINIMAX_CHINA_CODING_PLAN_API_KEY",
        },
    ],
    allowedEnvVars: ["MINIMAX_CHINA_CODING_PLAN_API_KEY"],
};
function getMiniMaxAuthEntry(auth, spec) {
    return getFirstAuthEntryValue(auth, spec.authKeys);
}
function isMiniMaxAuthData(value) {
    return value !== null && typeof value === "object";
}
function getMiniMaxCredential(auth) {
    return typeof auth.key === "string" ? auth.key.trim() : "";
}
function sanitizeMiniMaxAuthValue(value) {
    const sanitized = sanitizeDisplayText(value).replace(/\s+/g, " ").trim();
    return (sanitized || "unknown").slice(0, 120);
}
function asRecord(value) {
    return value !== null && typeof value === "object" ? value : null;
}
function getConfigOptionString(options, key) {
    const value = options[key];
    return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}
function extractMiniMaxConfigAuth(config, spec) {
    const provider = asRecord(asRecord(config)?.provider);
    if (!provider)
        return null;
    for (const providerKey of spec.providerKeys) {
        const options = asRecord(asRecord(provider[providerKey])?.options);
        if (!options)
            continue;
        const apiKey = getConfigOptionString(options, "apiKey");
        if (!apiKey)
            continue;
        const resolvedApiKey = resolveEnvTemplate(apiKey, spec.allowedEnvVars);
        if (!resolvedApiKey)
            continue;
        return {
            state: "configured",
            apiKey: resolvedApiKey,
            endpoint: spec.endpoint,
        };
    }
    return null;
}
async function resolveMiniMaxConfigAuth(spec) {
    const candidates = getGlobalOpencodeConfigCandidatePaths();
    for (const candidate of candidates) {
        const result = await readOpencodeConfig(candidate.path, candidate.isJsonc);
        if (!result)
            continue;
        const configAuth = extractMiniMaxConfigAuth(result.config, spec);
        if (!configAuth)
            continue;
        return {
            ...configAuth,
            source: result.isJsonc ? "opencode.jsonc" : "opencode.json",
        };
    }
    return null;
}
function resolveMiniMaxAuthForSpec(auth, spec) {
    const minimax = getMiniMaxAuthEntry(auth, spec);
    if (minimax === null || minimax === undefined) {
        return { state: "none" };
    }
    if (!isMiniMaxAuthData(minimax)) {
        return { state: "invalid", error: "MiniMax auth entry has invalid shape" };
    }
    if (typeof minimax.type !== "string") {
        return { state: "invalid", error: "MiniMax auth entry present but type is missing or invalid" };
    }
    if (minimax.type !== "api") {
        return {
            state: "invalid",
            error: `Unsupported MiniMax auth type: "${sanitizeMiniMaxAuthValue(minimax.type)}"`,
        };
    }
    const credential = getMiniMaxCredential(minimax);
    if (!credential) {
        return { state: "invalid", error: "MiniMax auth entry present but key is empty" };
    }
    return { state: "configured", apiKey: credential, endpoint: spec.endpoint };
}
/**
 * Resolve international MiniMax auth from the full auth data.
 */
export function resolveMiniMaxAuth(auth) {
    return resolveMiniMaxAuthForSpec(auth, MINIMAX_AUTH_SPEC);
}
/**
 * Resolve MiniMax China auth from the full auth data.
 */
export function resolveMiniMaxChinaAuth(auth) {
    return resolveMiniMaxAuthForSpec(auth, MINIMAX_CHINA_AUTH_SPEC);
}
async function resolveMiniMaxAuthWithSource(spec, params) {
    for (const envVar of spec.envVars) {
        const envKey = process.env[envVar.name]?.trim();
        if (envKey) {
            return {
                auth: { state: "configured", apiKey: envKey, endpoint: spec.endpoint },
                source: envVar.source,
            };
        }
    }
    const configAuth = await resolveMiniMaxConfigAuth(spec);
    if (configAuth) {
        return {
            auth: { state: "configured", apiKey: configAuth.apiKey, endpoint: configAuth.endpoint },
            source: configAuth.source,
        };
    }
    const maxAgeMs = Math.max(0, params?.maxAgeMs ?? DEFAULT_MINIMAX_AUTH_CACHE_MAX_AGE_MS);
    const authData = await readAuthFileCached({
        maxAgeMs,
    });
    const auth = resolveMiniMaxAuthForSpec(authData, spec);
    return {
        auth,
        source: auth.state === "none" ? null : "auth.json",
    };
}
export async function resolveMiniMaxAuthCached(params) {
    return (await resolveMiniMaxAuthWithSource(MINIMAX_AUTH_SPEC, params)).auth;
}
export async function resolveMiniMaxChinaAuthCached(params) {
    return (await resolveMiniMaxAuthWithSource(MINIMAX_CHINA_AUTH_SPEC, params)).auth;
}
async function getMiniMaxAuthDiagnosticsForSpec(spec, params) {
    const { auth, source } = await resolveMiniMaxAuthWithSource(spec, params);
    const checkedPaths = getApiKeyCheckedPaths({
        envVarNames: spec.envVars.map((envVar) => envVar.name),
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
            source: (source ?? "auth.json"),
            checkedPaths,
            authPaths,
            error: auth.error,
        };
    }
    return {
        state: "configured",
        source: (source ?? "auth.json"),
        endpoint: auth.endpoint,
        checkedPaths,
        authPaths,
    };
}
export async function getMiniMaxAuthDiagnostics(params) {
    return getMiniMaxAuthDiagnosticsForSpec(MINIMAX_AUTH_SPEC, params);
}
export async function getMiniMaxChinaAuthDiagnostics(params) {
    return getMiniMaxAuthDiagnosticsForSpec(MINIMAX_CHINA_AUTH_SPEC, params);
}
//# sourceMappingURL=minimax-auth.js.map