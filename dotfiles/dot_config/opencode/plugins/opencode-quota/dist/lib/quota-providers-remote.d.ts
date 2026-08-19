import type { QuotaToastEntry } from "./entries.js";
import type { RemoteApiQuotaProviderDefinition } from "./quota-providers.js";
export declare const QUOTA_PROVIDER_MAX_BODY_BYTES: number;
export declare const QUOTA_PROVIDER_MAX_REMOTE_ROWS = 100;
export declare const JSON_V1_MAX_RESPONSE_DEPTH = 32;
export declare const JSON_V1_MAX_CANDIDATES = 1600;
export declare const JSON_V1_MAX_ENTRIES = 100;
export declare const JSON_V1_MAX_DETAILED_ERRORS = 16;
export declare const QUOTA_PROVIDER_CONCURRENCY = 4;
export type QuotaProviderAuthSource = "env" | "opencode.json" | "opencode.jsonc" | "auth.json";
export interface QuotaProviderAuthResolution {
    key?: string;
    source: QuotaProviderAuthSource | null;
    checkedPaths: string[];
    authPaths: string[];
}
export type RemoteQuotaProviderResult = {
    success: true;
    entries: QuotaToastEntry[];
    rowErrors?: string[];
} | {
    success: false;
    error: string;
};
export declare function resolveQuotaProviderApiKey(source: RemoteApiQuotaProviderDefinition): Promise<QuotaProviderAuthResolution>;
export declare function fetchRemoteQuotaProvider(source: RemoteApiQuotaProviderDefinition, apiKey: string, requestTimeoutMs?: number): Promise<RemoteQuotaProviderResult>;
//# sourceMappingURL=quota-providers-remote.d.ts.map