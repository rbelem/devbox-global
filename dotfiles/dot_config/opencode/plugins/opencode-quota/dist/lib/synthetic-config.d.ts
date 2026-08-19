export interface SyntheticApiKeyResult {
    key: string;
    source: SyntheticKeySource;
}
export type SyntheticKeySource = "env:SYNTHETIC_API_KEY" | "opencode.json" | "opencode.jsonc" | "auth.json";
export { getGlobalOpencodeConfigCandidatePaths as getOpencodeConfigCandidatePaths } from "./api-key-resolver.js";
export declare function resolveSyntheticApiKey(): Promise<SyntheticApiKeyResult | null>;
export declare function hasSyntheticApiKey(): Promise<boolean>;
export declare function getSyntheticKeyDiagnostics(): Promise<{
    configured: boolean;
    source: SyntheticKeySource | null;
    checkedPaths: string[];
    authPaths: string[];
}>;
//# sourceMappingURL=synthetic-config.d.ts.map