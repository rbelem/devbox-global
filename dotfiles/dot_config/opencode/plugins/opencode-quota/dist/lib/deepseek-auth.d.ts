export interface DeepSeekApiKeyResult {
    key: string;
    source: DeepSeekKeySource;
}
export type DeepSeekKeySource = "env:DEEPSEEK_API_KEY" | "opencode.json" | "opencode.jsonc" | "auth.json";
export { getGlobalOpencodeConfigCandidatePaths as getOpencodeConfigCandidatePaths } from "./api-key-resolver.js";
export declare function resolveDeepSeekApiKey(): Promise<DeepSeekApiKeyResult | null>;
export declare function hasDeepSeekApiKey(): Promise<boolean>;
export declare function getDeepSeekKeyDiagnostics(): Promise<{
    configured: boolean;
    source: DeepSeekKeySource | null;
    checkedPaths: string[];
    authPaths: string[];
}>;
//# sourceMappingURL=deepseek-auth.d.ts.map