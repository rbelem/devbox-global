import { createProviderApiKeyResolver, getGlobalOpencodeConfigCandidatePaths, } from "./api-key-resolver.js";
import { getAuthPaths, readAuthFileCached } from "./opencode-auth.js";
export const DEFAULT_ZHIPU_AUTH_CACHE_MAX_AGE_MS = 5_000;
const ZHIPU_AUTH_KEYS = ["zhipu-coding-plan", "zhipuai-coding-plan"];
const ZHIPU_PROVIDER_KEYS = [
    "zhipu",
    "zhipu-coding-plan",
    "zhipuai-coding-plan",
    "glm-coding-plan",
];
const ALLOWED_ZHIPU_ENV_VARS = ["ZHIPU_API_KEY", "ZHIPU_CODING_PLAN_API_KEY"];
export { getGlobalOpencodeConfigCandidatePaths as getOpencodeConfigCandidatePaths } from "./api-key-resolver.js";
const zhipuAuthResolver = createProviderApiKeyResolver({
    envVars: [
        { name: "ZHIPU_API_KEY", source: "env:ZHIPU_API_KEY" },
        { name: "ZHIPU_CODING_PLAN_API_KEY", source: "env:ZHIPU_CODING_PLAN_API_KEY" },
    ],
    providerKeys: ZHIPU_PROVIDER_KEYS,
    allowedEnvVars: ALLOWED_ZHIPU_ENV_VARS,
    configJsonSource: "opencode.json",
    configJsoncSource: "opencode.jsonc",
    getConfigCandidates: getGlobalOpencodeConfigCandidatePaths,
    auth: {
        policy: "invalid-aware-api-key",
        authKeys: ZHIPU_AUTH_KEYS,
        authSource: "auth.json",
        displayName: "Zhipu",
        defaultMaxAgeMs: DEFAULT_ZHIPU_AUTH_CACHE_MAX_AGE_MS,
        readAuth: (maxAgeMs) => readAuthFileCached({ maxAgeMs }),
        getAuthPaths,
    },
});
export function resolveZhipuAuth(auth) {
    return zhipuAuthResolver.parseAuth(auth);
}
export async function resolveZhipuAuthCached(params) {
    return zhipuAuthResolver.resolve(params);
}
export async function getZhipuAuthDiagnostics(params) {
    return zhipuAuthResolver.diagnostics(params);
}
//# sourceMappingURL=zhipu-auth.js.map