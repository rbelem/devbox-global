import { createProviderApiKeyResolver, getGlobalOpencodeConfigCandidatePaths, } from "./api-key-resolver.js";
import { getAuthPaths, readAuthFile } from "./opencode-auth.js";
export { getGlobalOpencodeConfigCandidatePaths as getOpencodeConfigCandidatePaths } from "./api-key-resolver.js";
const ollamaCloudApiKeyResolver = createProviderApiKeyResolver({
    envVars: [{ name: "OLLAMA_API_KEY", source: "env:OLLAMA_API_KEY" }],
    providerKeys: ["ollama-cloud"],
    allowedEnvVars: ["OLLAMA_API_KEY"],
    configJsonSource: "opencode.json",
    configJsoncSource: "opencode.jsonc",
    getConfigCandidates: getGlobalOpencodeConfigCandidatePaths,
    auth: {
        readAuth: readAuthFile,
        getAuthPaths,
        authSource: "auth.json",
    },
});
export async function resolveOllamaCloudApiKey() {
    return ollamaCloudApiKeyResolver.resolve();
}
export async function hasOllamaCloudApiKey() {
    return ollamaCloudApiKeyResolver.has();
}
export async function getOllamaCloudKeyDiagnostics() {
    return ollamaCloudApiKeyResolver.diagnostics();
}
//# sourceMappingURL=ollama-cloud-config.js.map