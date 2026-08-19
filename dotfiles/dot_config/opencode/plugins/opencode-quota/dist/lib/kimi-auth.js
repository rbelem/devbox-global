import { createProviderApiKeyResolver, getGlobalOpencodeConfigCandidatePaths, } from "./api-key-resolver.js";
import { getAuthPaths, readAuthFileCached } from "./opencode-auth.js";
export const DEFAULT_KIMI_AUTH_CACHE_MAX_AGE_MS = 5_000;
const KIMI_AUTH_KEYS = ["kimi-for-coding", "kimi-code", "kimi"];
const KIMI_PROVIDER_KEYS = ["kimi-for-coding", "kimi-code", "kimi"];
const ALLOWED_KIMI_ENV_VARS = ["KIMI_API_KEY", "KIMI_CODE_API_KEY"];
export { getGlobalOpencodeConfigCandidatePaths as getOpencodeConfigCandidatePaths } from "./api-key-resolver.js";
const kimiAuthResolver = createProviderApiKeyResolver({
    envVars: [
        { name: "KIMI_API_KEY", source: "env:KIMI_API_KEY" },
        { name: "KIMI_CODE_API_KEY", source: "env:KIMI_CODE_API_KEY" },
    ],
    providerKeys: KIMI_PROVIDER_KEYS,
    allowedEnvVars: ALLOWED_KIMI_ENV_VARS,
    configJsonSource: "opencode.json",
    configJsoncSource: "opencode.jsonc",
    getConfigCandidates: getGlobalOpencodeConfigCandidatePaths,
    auth: {
        policy: "invalid-aware-api-key",
        authKeys: KIMI_AUTH_KEYS,
        authSource: "auth.json",
        displayName: "Kimi",
        defaultMaxAgeMs: DEFAULT_KIMI_AUTH_CACHE_MAX_AGE_MS,
        readAuth: (maxAgeMs) => readAuthFileCached({ maxAgeMs }),
        getAuthPaths,
    },
});
export function resolveKimiAuth(auth) {
    return kimiAuthResolver.parseAuth(auth);
}
export async function resolveKimiAuthCached(params) {
    return kimiAuthResolver.resolve(params);
}
export async function getKimiAuthDiagnostics(params) {
    return kimiAuthResolver.diagnostics(params);
}
//# sourceMappingURL=kimi-auth.js.map