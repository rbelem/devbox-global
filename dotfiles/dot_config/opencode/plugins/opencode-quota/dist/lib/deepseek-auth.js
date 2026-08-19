import { createProviderApiKeyResolver, getGlobalOpencodeConfigCandidatePaths, } from "./api-key-resolver.js";
import { getAuthPaths, readAuthFile } from "./opencode-auth.js";
const ALLOWED_DEEPSEEK_ENV_VARS = ["DEEPSEEK_API_KEY"];
const DEEPSEEK_PROVIDER_KEYS = ["deepseek"];
export { getGlobalOpencodeConfigCandidatePaths as getOpencodeConfigCandidatePaths } from "./api-key-resolver.js";
const deepseekApiKeyResolver = createProviderApiKeyResolver({
    envVars: [{ name: "DEEPSEEK_API_KEY", source: "env:DEEPSEEK_API_KEY" }],
    providerKeys: DEEPSEEK_PROVIDER_KEYS,
    allowedEnvVars: ALLOWED_DEEPSEEK_ENV_VARS,
    configJsonSource: "opencode.json",
    configJsoncSource: "opencode.jsonc",
    getConfigCandidates: getGlobalOpencodeConfigCandidatePaths,
    auth: {
        readAuth: readAuthFile,
        getAuthPaths,
        authSource: "auth.json",
    },
});
export async function resolveDeepSeekApiKey() {
    return deepseekApiKeyResolver.resolve();
}
export async function hasDeepSeekApiKey() {
    return deepseekApiKeyResolver.has();
}
export async function getDeepSeekKeyDiagnostics() {
    return deepseekApiKeyResolver.diagnostics();
}
//# sourceMappingURL=deepseek-auth.js.map