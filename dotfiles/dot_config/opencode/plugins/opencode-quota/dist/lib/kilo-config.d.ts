export interface KiloApiKeyResult {
    key: string;
    source: KiloKeySource;
}
export type KiloKeySource = "env:KILO_API_KEY" | "opencode.json" | "opencode.jsonc" | "auth.json";
export { getGlobalOpencodeConfigCandidatePaths as getOpencodeConfigCandidatePaths } from "./api-key-resolver.js";
export declare function resolveKiloApiKey(): Promise<KiloApiKeyResult | null>;
export declare function hasKiloApiKey(): Promise<boolean>;
export declare function getKiloKeyDiagnostics(): Promise<{
    configured: boolean;
    source: KiloKeySource | null;
    checkedPaths: string[];
    authPaths: string[];
}>;
//# sourceMappingURL=kilo-config.d.ts.map