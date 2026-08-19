export interface OllamaCloudApiKeyResult {
    key: string;
    source: OllamaCloudKeySource;
}
export type OllamaCloudKeySource = "env:OLLAMA_API_KEY" | "opencode.json" | "opencode.jsonc" | "auth.json";
export { getGlobalOpencodeConfigCandidatePaths as getOpencodeConfigCandidatePaths } from "./api-key-resolver.js";
export declare function resolveOllamaCloudApiKey(): Promise<OllamaCloudApiKeyResult | null>;
export declare function hasOllamaCloudApiKey(): Promise<boolean>;
export declare function getOllamaCloudKeyDiagnostics(): Promise<{
    configured: boolean;
    source: OllamaCloudKeySource | null;
    checkedPaths: string[];
    authPaths: string[];
}>;
//# sourceMappingURL=ollama-cloud-config.d.ts.map