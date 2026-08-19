/**
 * Generic API key resolution from env vars, config files, and auth.json.
 *
 * Used by provider-specific config modules (synthetic-config, chutes-config)
 * to resolve API keys with consistent priority and behavior.
 */
import { existsSync } from "fs";
import { sanitizeDisplayText } from "./display-sanitize.js";
import { resolveEnvTemplate } from "./env-template.js";
import { buildOpenCodeConfigCandidates, readOpenCodeConfigCandidate, } from "./opencode-config-read.js";
import { getOpencodeRuntimeDirCandidates } from "./opencode-runtime-paths.js";
function buildOpencodeConfigCandidates(configDirs) {
    return buildOpenCodeConfigCandidates({
        directories: configDirs,
        formatOrder: ["jsonc", "json"],
    }).map((candidate) => ({
        path: candidate.path,
        isJsonc: candidate.format === "jsonc",
    }));
}
/**
 * Get candidate paths for opencode.json/opencode.jsonc files.
 *
 * Order: local (cwd) first, then global (~/.config/opencode).
 * Within each location, .jsonc takes precedence over .json.
 */
export function getOpencodeConfigCandidatePaths() {
    const cwd = process.cwd();
    const { configDirs } = getOpencodeRuntimeDirCandidates();
    return [...buildOpencodeConfigCandidates([cwd]), ...buildOpencodeConfigCandidates(configDirs)];
}
/**
 * Get trusted global-only candidate paths for opencode.json/opencode.jsonc files.
 *
 * Provider secrets must not be sourced from repo-local config because the
 * current workspace may be untrusted.
 */
export function getGlobalOpencodeConfigCandidatePaths() {
    const { configDirs } = getOpencodeRuntimeDirCandidates();
    return buildOpencodeConfigCandidates(configDirs);
}
/**
 * Read and parse an opencode config file.
 *
 * @returns Parsed config with metadata, or null if file doesn't exist or is invalid
 */
export async function readOpencodeConfig(filePath, isJsonc) {
    const result = await readOpenCodeConfigCandidate({
        path: filePath,
        format: isJsonc ? "jsonc" : "json",
    });
    return result.state === "parsed" ? { config: result.value, path: filePath, isJsonc } : null;
}
function asRecord(value) {
    return value && typeof value === "object" ? value : null;
}
export function getFirstAuthEntryValue(auth, authKeys) {
    const root = asRecord(auth);
    if (!root)
        return undefined;
    for (const authKey of authKeys) {
        if (Object.hasOwn(root, authKey)) {
            return root[authKey];
        }
    }
    return undefined;
}
export function getFirstAuthEntryRecord(auth, authKeys) {
    return asRecord(getFirstAuthEntryValue(auth, authKeys));
}
export function extractProviderOptionsApiKey(config, params) {
    const provider = asRecord(asRecord(config)?.provider);
    if (!provider)
        return null;
    for (const providerKey of params.providerKeys) {
        const options = asRecord(asRecord(provider[providerKey])?.options);
        const apiKey = options?.apiKey;
        if (typeof apiKey !== "string" || apiKey.trim().length === 0)
            continue;
        const trimmed = apiKey.trim();
        if (!params.allowedEnvVars)
            return trimmed;
        const resolved = resolveEnvTemplate(trimmed, params.allowedEnvVars);
        if (resolved)
            return resolved;
    }
    return null;
}
export function extractAuthApiKeyEntry(auth, authKeys) {
    for (const authKey of authKeys) {
        const record = getFirstAuthEntryRecord(auth, [authKey]);
        const key = record?.key;
        if (record?.type === "api" && typeof key === "string" && key.trim().length > 0) {
            return key.trim();
        }
    }
    return null;
}
function buildProviderEnvAndConfig(config) {
    return {
        envVars: config.envVars,
        extractFromConfig: (candidate) => extractProviderOptionsApiKey(candidate, {
            providerKeys: config.providerKeys,
            allowedEnvVars: config.allowedEnvVars,
        }),
        configJsonSource: config.configJsonSource,
        configJsoncSource: config.configJsoncSource,
        getConfigCandidates: config.getConfigCandidates,
    };
}
function parseInvalidAwareAuth(auth, config) {
    const entry = getFirstAuthEntryValue(auth, config.authKeys);
    if (entry === null || entry === undefined)
        return { state: "none" };
    if (typeof entry !== "object") {
        return { state: "invalid", error: `${config.displayName} auth entry has invalid shape` };
    }
    const record = entry;
    if (typeof record.type !== "string") {
        return {
            state: "invalid",
            error: `${config.displayName} auth entry present but type is missing or invalid`,
        };
    }
    if (record.type !== "api") {
        const sanitized = sanitizeDisplayText(record.type).replace(/\s+/g, " ").trim();
        return {
            state: "invalid",
            error: config.unsupportedTypeError ??
                `Unsupported ${config.displayName} auth type: "${(sanitized || "unknown").slice(0, 120)}"`,
        };
    }
    const apiKey = typeof record.key === "string" ? record.key.trim() : "";
    return apiKey
        ? { state: "configured", apiKey }
        : {
            state: "invalid",
            error: `${config.displayName} auth entry present but key is empty`,
        };
}
function createInvalidAwareProviderApiKeyResolver(config) {
    const parseAuth = (auth) => parseInvalidAwareAuth(auth, config.auth);
    const resolveWithSource = async (params) => {
        const envOrConfig = await resolveApiKeyFromEnvAndConfig(buildProviderEnvAndConfig(config));
        if (envOrConfig) {
            return {
                auth: { state: "configured", apiKey: envOrConfig.key },
                source: envOrConfig.source,
            };
        }
        const maxAgeMs = Math.max(0, params?.maxAgeMs ?? config.auth.defaultMaxAgeMs);
        const auth = parseAuth(await config.auth.readAuth(maxAgeMs));
        return {
            auth,
            source: auth.state === "none" ? null : config.auth.authSource,
        };
    };
    return {
        parseAuth,
        resolve: async (params) => (await resolveWithSource(params)).auth,
        diagnostics: async (params) => {
            const { auth, source } = await resolveWithSource(params);
            const paths = {
                checkedPaths: getApiKeyCheckedPaths({
                    envVarNames: config.envVars.map((envVar) => envVar.name),
                    getConfigCandidates: config.getConfigCandidates,
                }),
                authPaths: config.auth.getAuthPaths(),
            };
            if (auth.state === "none")
                return { state: "none", source: null, ...paths };
            if (auth.state === "invalid") {
                return {
                    state: "invalid",
                    source: config.auth.authSource,
                    error: auth.error,
                    ...paths,
                };
            }
            return {
                state: "configured",
                source: source ?? config.auth.authSource,
                ...paths,
            };
        },
    };
}
export function createProviderApiKeyResolver(config) {
    if (config.auth?.policy === "invalid-aware-api-key") {
        return createInvalidAwareProviderApiKeyResolver(config);
    }
    const simpleConfig = config;
    const resolve = () => resolveProviderApiKey(simpleConfig);
    return {
        resolve,
        has: async () => (await resolve()) !== null,
        diagnostics: async () => ({
            ...(await getApiKeyDiagnostics({
                envVarNames: simpleConfig.envVars.map((envVar) => envVar.name),
                resolve,
                getConfigCandidates: simpleConfig.getConfigCandidates,
            })),
            authPaths: simpleConfig.auth?.getAuthPaths?.() ?? [],
        }),
    };
}
/**
 * Resolve an API key from trusted env vars and config files.
 *
 * Priority (first wins):
 * 1. Environment variables (in order specified)
 * 2. Trusted user/global opencode.json/opencode.jsonc candidates
 */
export async function resolveApiKeyFromEnvAndConfig(config) {
    for (const envVar of config.envVars) {
        const value = process.env[envVar.name]?.trim();
        if (value && value.length > 0) {
            return { key: value, source: envVar.source };
        }
    }
    const candidates = config.getConfigCandidates?.() ?? getGlobalOpencodeConfigCandidatePaths();
    for (const candidate of candidates) {
        const result = await readOpencodeConfig(candidate.path, candidate.isJsonc);
        if (!result)
            continue;
        const key = config.extractFromConfig(result.config);
        if (key) {
            return {
                key,
                source: result.isJsonc ? config.configJsoncSource : config.configJsonSource,
            };
        }
    }
    return null;
}
export function getApiKeyCheckedPaths(config) {
    const checkedPaths = [];
    for (const envVarName of config.envVarNames) {
        if (process.env[envVarName] !== undefined) {
            checkedPaths.push(`env:${envVarName}`);
        }
    }
    const candidates = config.getConfigCandidates?.() ?? getGlobalOpencodeConfigCandidatePaths();
    for (const candidate of candidates) {
        if (existsSync(candidate.path)) {
            checkedPaths.push(candidate.path);
        }
    }
    return checkedPaths;
}
/**
 * Resolve an API key from multiple sources with consistent priority.
 *
 * Priority (first wins):
 * 1. Environment variables (in order specified)
 * 2. Trusted user/global opencode.json/opencode.jsonc
 * 3. auth.json
 *
 * @returns API key and source, or null if not found
 */
export async function resolveApiKey(config, readAuth) {
    const resolvedFromEnvOrConfig = await resolveApiKeyFromEnvAndConfig(config);
    if (resolvedFromEnvOrConfig) {
        return resolvedFromEnvOrConfig;
    }
    // 3. Fallback to auth.json
    const auth = await readAuth();
    const key = config.extractFromAuth(auth);
    if (key) {
        return { key, source: config.authSource };
    }
    return null;
}
export async function resolveProviderApiKey(config) {
    const envAndConfig = buildProviderEnvAndConfig(config);
    if (!config.auth) {
        return resolveApiKeyFromEnvAndConfig(envAndConfig);
    }
    return resolveApiKey({
        ...envAndConfig,
        extractFromAuth: (auth) => extractAuthApiKeyEntry(auth, config.auth?.authKeys ?? config.providerKeys),
        authSource: config.auth.authSource,
    }, config.auth.readAuth);
}
/**
 * Get diagnostic info about API key configuration.
 *
 * Reports which sources were checked (env vars that exist, config files that exist)
 * and whether a key was found.
 */
export async function getApiKeyDiagnostics(config) {
    const checkedPaths = getApiKeyCheckedPaths(config);
    const result = await config.resolve();
    return {
        configured: result !== null,
        source: result?.source ?? null,
        checkedPaths,
    };
}
//# sourceMappingURL=api-key-resolver.js.map