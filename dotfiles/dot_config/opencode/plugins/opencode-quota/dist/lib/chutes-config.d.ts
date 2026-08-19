export interface ChutesApiKeyResult {
    key: string;
    source: ChutesKeySource;
}
export type ChutesKeySource = "env:CHUTES_API_KEY" | "opencode.json" | "opencode.jsonc" | "auth.json";
export { getGlobalOpencodeConfigCandidatePaths as getOpencodeConfigCandidatePaths } from "./api-key-resolver.js";
export declare function resolveChutesApiKey(): Promise<ChutesApiKeyResult | null>;
export declare function hasChutesApiKey(): Promise<boolean>;
export declare function getChutesKeyDiagnostics(): Promise<{
    configured: boolean;
    source: ChutesKeySource | null;
    checkedPaths: string[];
    authPaths: string[];
}>;
//# sourceMappingURL=chutes-config.d.ts.map