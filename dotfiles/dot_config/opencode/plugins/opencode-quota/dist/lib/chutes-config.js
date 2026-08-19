import { createProviderApiKeyResolver, getGlobalOpencodeConfigCandidatePaths, } from "./api-key-resolver.js";
import { getAuthPaths, readAuthFile } from "./opencode-auth.js";
const ALLOWED_CHUTES_ENV_VARS = ["CHUTES_API_KEY"];
const CHUTES_PROVIDER_KEYS = ["chutes"];
export { getGlobalOpencodeConfigCandidatePaths as getOpencodeConfigCandidatePaths } from "./api-key-resolver.js";
const chutesApiKeyResolver = createProviderApiKeyResolver({
    envVars: [{ name: "CHUTES_API_KEY", source: "env:CHUTES_API_KEY" }],
    providerKeys: CHUTES_PROVIDER_KEYS,
    allowedEnvVars: ALLOWED_CHUTES_ENV_VARS,
    configJsonSource: "opencode.json",
    configJsoncSource: "opencode.jsonc",
    getConfigCandidates: getGlobalOpencodeConfigCandidatePaths,
    auth: {
        readAuth: readAuthFile,
        getAuthPaths,
        authSource: "auth.json",
    },
});
export async function resolveChutesApiKey() {
    return chutesApiKeyResolver.resolve();
}
export async function hasChutesApiKey() {
    return chutesApiKeyResolver.has();
}
export async function getChutesKeyDiagnostics() {
    return chutesApiKeyResolver.diagnostics();
}
//# sourceMappingURL=chutes-config.js.map