import { createProviderApiKeyResolver, getGlobalOpencodeConfigCandidatePaths, } from "./api-key-resolver.js";
import { getAuthPaths, readAuthFile } from "./opencode-auth.js";
const ALLOWED_NANOGPT_ENV_VARS = ["NANOGPT_API_KEY", "NANO_GPT_API_KEY"];
const NANOGPT_PROVIDER_KEYS = ["nanogpt", "nano-gpt"];
export { getGlobalOpencodeConfigCandidatePaths as getOpencodeConfigCandidatePaths } from "./api-key-resolver.js";
const nanoGptApiKeyResolver = createProviderApiKeyResolver({
    envVars: [
        { name: "NANOGPT_API_KEY", source: "env:NANOGPT_API_KEY" },
        { name: "NANO_GPT_API_KEY", source: "env:NANO_GPT_API_KEY" },
    ],
    providerKeys: NANOGPT_PROVIDER_KEYS,
    allowedEnvVars: ALLOWED_NANOGPT_ENV_VARS,
    configJsonSource: "opencode.json",
    configJsoncSource: "opencode.jsonc",
    getConfigCandidates: getGlobalOpencodeConfigCandidatePaths,
    auth: {
        readAuth: readAuthFile,
        getAuthPaths,
        authSource: "auth.json",
    },
});
export async function resolveNanoGptApiKey() {
    return nanoGptApiKeyResolver.resolve();
}
export async function hasNanoGptApiKey() {
    return nanoGptApiKeyResolver.has();
}
export async function getNanoGptKeyDiagnostics() {
    return nanoGptApiKeyResolver.diagnostics();
}
//# sourceMappingURL=nanogpt-config.js.map