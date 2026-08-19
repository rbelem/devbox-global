import { createProviderApiKeyResolver, getGlobalOpencodeConfigCandidatePaths, } from "./api-key-resolver.js";
import { getAuthPaths, readAuthFile } from "./opencode-auth.js";
const ALLOWED_SYNTHETIC_ENV_VARS = ["SYNTHETIC_API_KEY"];
const SYNTHETIC_PROVIDER_KEYS = ["synthetic"];
export { getGlobalOpencodeConfigCandidatePaths as getOpencodeConfigCandidatePaths } from "./api-key-resolver.js";
const syntheticApiKeyResolver = createProviderApiKeyResolver({
    envVars: [{ name: "SYNTHETIC_API_KEY", source: "env:SYNTHETIC_API_KEY" }],
    providerKeys: SYNTHETIC_PROVIDER_KEYS,
    allowedEnvVars: ALLOWED_SYNTHETIC_ENV_VARS,
    configJsonSource: "opencode.json",
    configJsoncSource: "opencode.jsonc",
    getConfigCandidates: getGlobalOpencodeConfigCandidatePaths,
    auth: {
        readAuth: readAuthFile,
        getAuthPaths,
        authSource: "auth.json",
    },
});
export async function resolveSyntheticApiKey() {
    return syntheticApiKeyResolver.resolve();
}
export async function hasSyntheticApiKey() {
    return syntheticApiKeyResolver.has();
}
export async function getSyntheticKeyDiagnostics() {
    return syntheticApiKeyResolver.diagnostics();
}
//# sourceMappingURL=synthetic-config.js.map