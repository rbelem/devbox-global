import { createProviderApiKeyResolver, getGlobalOpencodeConfigCandidatePaths, } from "./api-key-resolver.js";
import { getAuthPaths, readAuthFileCached } from "./opencode-auth.js";
export const DEFAULT_ZAI_AUTH_CACHE_MAX_AGE_MS = 5_000;
const ZAI_AUTH_KEYS = ["zai-coding-plan"];
const ZAI_PROVIDER_KEYS = ["zai", "zai-coding-plan", "glm"];
const ALLOWED_ZAI_ENV_VARS = ["ZAI_API_KEY", "ZAI_CODING_PLAN_API_KEY"];
export { getGlobalOpencodeConfigCandidatePaths as getOpencodeConfigCandidatePaths } from "./api-key-resolver.js";
const zaiAuthResolver = createProviderApiKeyResolver({
    envVars: [
        { name: "ZAI_API_KEY", source: "env:ZAI_API_KEY" },
        { name: "ZAI_CODING_PLAN_API_KEY", source: "env:ZAI_CODING_PLAN_API_KEY" },
    ],
    providerKeys: ZAI_PROVIDER_KEYS,
    allowedEnvVars: ALLOWED_ZAI_ENV_VARS,
    configJsonSource: "opencode.json",
    configJsoncSource: "opencode.jsonc",
    getConfigCandidates: getGlobalOpencodeConfigCandidatePaths,
    auth: {
        policy: "invalid-aware-api-key",
        authKeys: ZAI_AUTH_KEYS,
        authSource: "auth.json",
        displayName: "Z.ai",
        defaultMaxAgeMs: DEFAULT_ZAI_AUTH_CACHE_MAX_AGE_MS,
        readAuth: (maxAgeMs) => readAuthFileCached({ maxAgeMs }),
        getAuthPaths,
    },
});
export function resolveZaiAuth(auth) {
    return zaiAuthResolver.parseAuth(auth);
}
export async function resolveZaiAuthCached(params) {
    return zaiAuthResolver.resolve(params);
}
export async function getZaiAuthDiagnostics(params) {
    return zaiAuthResolver.diagnostics(params);
}
//# sourceMappingURL=zai-auth.js.map