import { readFile } from "fs/promises";
import { join } from "path";
import { getOpencodeRuntimeDirCandidates } from "./opencode-runtime-paths.js";
function getConfigCandidatePaths() {
    const { configDirs } = getOpencodeRuntimeDirCandidates();
    return configDirs.map((dir) => join(dir, "opencode-quota", "opencode.json"));
}
function getConfigFileError(error) {
    if (error instanceof SyntaxError) {
        return "Failed to parse JSON";
    }
    if (error instanceof Error && error.message) {
        return `Failed to read config file: ${error.message}`;
    }
    return `Failed to read config file: ${String(error)}`;
}
async function readConfigFile(path) {
    try {
        const data = await readFile(path, "utf8");
        const parsed = JSON.parse(data);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
            return { state: "invalid", error: "Config file must contain a JSON object" };
        }
        return { state: "loaded", config: parsed };
    }
    catch (error) {
        if (error?.code === "ENOENT") {
            return { state: "missing" };
        }
        return { state: "invalid", error: getConfigFileError(error) };
    }
}
export function resolveOpenCodeZenConfigFromEnv(env = process.env) {
    const workspaceId = env.OPENCODE_WORKSPACE_ID?.trim();
    const authCookie = env.OPENCODE_AUTH_COOKIE?.trim();
    if (workspaceId && authCookie) {
        return {
            state: "configured",
            config: { workspaceId, authCookie },
            source: "env(OPENCODE_*)",
        };
    }
    if (workspaceId || authCookie) {
        return {
            state: "incomplete",
            source: "env(OPENCODE_*)",
            missing: workspaceId ? "OPENCODE_AUTH_COOKIE" : "OPENCODE_WORKSPACE_ID",
        };
    }
    return null;
}
export async function resolveOpenCodeZenConfig() {
    const envResult = resolveOpenCodeZenConfigFromEnv();
    if (envResult)
        return envResult;
    for (const path of getConfigCandidatePaths()) {
        const fileResult = await readConfigFile(path);
        if (fileResult.state === "missing")
            continue;
        if (fileResult.state === "invalid") {
            return { state: "invalid", source: path, error: fileResult.error };
        }
        const workspaceId = typeof fileResult.config.workspaceId === "string" ? fileResult.config.workspaceId.trim() : "";
        const authCookie = typeof fileResult.config.authCookie === "string" ? fileResult.config.authCookie.trim() : "";
        if (workspaceId && authCookie) {
            return {
                state: "configured",
                config: { workspaceId, authCookie },
                source: path,
            };
        }
        return {
            state: "incomplete",
            source: path,
            missing: workspaceId ? "authCookie" : "workspaceId",
        };
    }
    return { state: "none" };
}
let cachedConfig = null;
let cachedAt = 0;
export const DEFAULT_OPENCODE_ZEN_CONFIG_CACHE_MAX_AGE_MS = 30_000;
export async function resolveOpenCodeZenConfigCached(params) {
    const maxAgeMs = Math.max(0, params?.maxAgeMs ?? DEFAULT_OPENCODE_ZEN_CONFIG_CACHE_MAX_AGE_MS);
    const now = Date.now();
    if (cachedConfig && now - cachedAt < maxAgeMs) {
        return cachedConfig;
    }
    cachedConfig = await resolveOpenCodeZenConfig();
    cachedAt = now;
    return cachedConfig;
}
export async function getOpenCodeZenConfigDiagnostics() {
    const resolved = await resolveOpenCodeZenConfig();
    return {
        state: resolved.state,
        source: "source" in resolved ? resolved.source : null,
        missing: "missing" in resolved ? resolved.missing : null,
        error: "error" in resolved ? resolved.error : null,
        checkedPaths: getConfigCandidatePaths(),
    };
}
//# sourceMappingURL=opencode-zen-config.js.map