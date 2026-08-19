import { createProviderApiKeyResolver, getGlobalOpencodeConfigCandidatePaths, } from "./api-key-resolver.js";
import { getAuthPaths, readAuthFile } from "./opencode-auth.js";
export { getGlobalOpencodeConfigCandidatePaths as getOpencodeConfigCandidatePaths } from "./api-key-resolver.js";
const kiloApiKeyResolver = createProviderApiKeyResolver({
    envVars: [{ name: "KILO_API_KEY", source: "env:KILO_API_KEY" }],
    providerKeys: ["kilo"],
    allowedEnvVars: ["KILO_API_KEY"],
    configJsonSource: "opencode.json",
    configJsoncSource: "opencode.jsonc",
    getConfigCandidates: getGlobalOpencodeConfigCandidatePaths,
    auth: {
        readAuth: readAuthFile,
        getAuthPaths,
        authSource: "auth.json",
    },
});
export async function resolveKiloApiKey() {
    return kiloApiKeyResolver.resolve();
}
export async function hasKiloApiKey() {
    return kiloApiKeyResolver.has();
}
export async function getKiloKeyDiagnostics() {
    return kiloApiKeyResolver.diagnostics();
}
//# sourceMappingURL=kilo-config.js.map