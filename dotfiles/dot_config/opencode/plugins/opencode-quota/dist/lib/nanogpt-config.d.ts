export interface NanoGptApiKeyResult {
    key: string;
    source: NanoGptKeySource;
}
export type NanoGptKeySource = "env:NANOGPT_API_KEY" | "env:NANO_GPT_API_KEY" | "opencode.json" | "opencode.jsonc" | "auth.json";
export { getGlobalOpencodeConfigCandidatePaths as getOpencodeConfigCandidatePaths } from "./api-key-resolver.js";
export declare function resolveNanoGptApiKey(): Promise<NanoGptApiKeyResult | null>;
export declare function hasNanoGptApiKey(): Promise<boolean>;
export declare function getNanoGptKeyDiagnostics(): Promise<{
    configured: boolean;
    source: NanoGptKeySource | null;
    checkedPaths: string[];
    authPaths: string[];
}>;
//# sourceMappingURL=nanogpt-config.d.ts.map