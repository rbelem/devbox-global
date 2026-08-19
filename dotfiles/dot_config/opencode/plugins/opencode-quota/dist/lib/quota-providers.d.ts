import type { AccountingResultType } from "./entries.js";
export declare const QUOTA_PROVIDER_REMOTE_FORMATS: readonly ["quota-v1", "openrouter-key-v1", "json-v1"];
export declare const QUOTA_PROVIDER_MODES: readonly ["remote-api", "local-estimate"];
export declare const QUOTA_PROVIDER_WINDOW_TYPES: readonly ["utc-day", "rolling"];
export declare const QUOTA_PROVIDERS_AGGREGATE_ID = "quota-providers";
export declare const MAINTAINED_LOCAL_ESTIMATE_IDS: readonly ["qwen-code", "alibaba-coding-plan"];
export declare function isMaintainedQuotaProviderTuning(definition: QuotaProviderDefinition): boolean;
export declare function customQuotaProviderDefinitions(definitions: readonly QuotaProviderDefinition[]): QuotaProviderDefinition[];
export declare function resolveQuotaProviderSessionModelIdentity(params: {
    currentModel: string;
    currentProviderID?: string;
}): {
    providerId: string;
    modelId: string;
} | null;
export declare function selectEligibleQuotaProviderDefinitions(params: {
    definitions: readonly QuotaProviderDefinition[];
    availableProviderIds: ReadonlySet<string>;
    onlyCurrentModel?: boolean;
    currentModel?: string;
    currentProviderID?: string;
}): QuotaProviderDefinition[];
export type QuotaProviderRemoteFormat = (typeof QUOTA_PROVIDER_REMOTE_FORMATS)[number];
export type QuotaProviderMode = (typeof QUOTA_PROVIDER_MODES)[number];
export type QuotaProviderWindowType = (typeof QUOTA_PROVIDER_WINDOW_TYPES)[number];
export type JsonV1Path = string[];
export type JsonV1NumberSource = {
    path: JsonV1Path;
    divideBy?: 100 | 1_000 | 1_000_000;
} | {
    literal: number;
};
export type JsonV1TextSource = {
    path: JsonV1Path;
} | {
    literal: string;
};
export type JsonV1TimestampEncoding = "iso-8601" | "unix-seconds" | "unix-milliseconds";
export type JsonV1TimestampSource = {
    path: JsonV1Path;
    encoding: JsonV1TimestampEncoding;
} | {
    literal: string | number;
    encoding: JsonV1TimestampEncoding;
};
export type JsonV1Metric = {
    type: "percentage";
    percentage: JsonV1NumberSource;
    meaning: "remaining" | "used";
} | {
    type: "used-limit";
    used: JsonV1NumberSource;
    limit: JsonV1NumberSource;
} | {
    type: "remaining-limit";
    remaining: JsonV1NumberSource;
    limit: JsonV1NumberSource;
} | {
    type: "spend-budget";
    spend: JsonV1NumberSource;
    budget: JsonV1NumberSource;
} | {
    type: "remaining-budget";
    remaining: JsonV1NumberSource;
    budget: JsonV1NumberSource;
} | {
    type: "value";
    valueType: "used" | "limit" | "remaining" | "balance" | "spend" | "budget";
    value: JsonV1NumberSource;
} | {
    type: "status";
    value: JsonV1TextSource;
};
export interface JsonV1Mapping {
    resultType: AccountingResultType;
    name: string;
    label?: string;
    unit?: string;
    unitPosition?: "prefix" | "suffix";
    resetTime?: JsonV1TimestampSource;
    observedTime?: JsonV1TimestampSource;
    metric: JsonV1Metric;
}
export interface JsonV1Adapter {
    rowsPath?: JsonV1Path;
    mappings: JsonV1Mapping[];
}
interface QuotaProviderDefinitionBase {
    id: string;
    /** Effective OpenCode provider id. Input omits this when it is the same as id. */
    providerId: string;
    /** Normalized display label; omitted input defaults to id. */
    label: string;
    mode: QuotaProviderMode;
    /** Exact OpenCode model ids, without a provider prefix. Omission covers the provider. */
    modelIds?: string[];
}
interface RemoteApiQuotaProviderDefinitionBase extends QuotaProviderDefinitionBase {
    mode: "remote-api";
    /** Canonical absolute HTTPS URL, or loopback HTTP URL. */
    url: string;
    apiKeyEnv?: string;
}
export type RemoteApiQuotaProviderDefinition = (RemoteApiQuotaProviderDefinitionBase & {
    format: "quota-v1" | "openrouter-key-v1";
    adapter?: never;
}) | (RemoteApiQuotaProviderDefinitionBase & {
    format: "json-v1";
    adapter: JsonV1Adapter;
});
export interface LocalEstimateWindow {
    id: string;
    label: string;
    type: QuotaProviderWindowType;
    /** Present only for rolling windows. */
    durationMinutes?: number;
    requestLimit: number;
    usdBudget?: number;
}
export interface LocalEstimateQuotaProviderDefinition extends QuotaProviderDefinitionBase {
    mode: "local-estimate";
    windows: LocalEstimateWindow[];
    /**
     * Exact source model id -> models.dev provider/model fallback.
     * Automatic models.dev matching always wins.
     */
    pricingModelMap?: Record<string, string>;
}
export type QuotaProviderDefinition = RemoteApiQuotaProviderDefinition | LocalEstimateQuotaProviderDefinition;
export interface QuotaProviderValidationIssue {
    key: string;
    message: string;
}
export type QuotaProvidersValidationResult = {
    value: QuotaProviderDefinition[];
    issues: [];
} | {
    value?: undefined;
    issues: QuotaProviderValidationIssue[];
};
export declare const JSON_V1_MAX_MAPPINGS = 16;
export declare const JSON_V1_MAX_ADAPTER_DEPTH = 8;
export declare const JSON_V1_MAX_ADAPTER_OBJECTS = 128;
export declare const JSON_V1_MAX_ADAPTER_PROPERTIES = 384;
export declare const JSON_V1_MAX_ADAPTER_ARRAY_ELEMENTS = 640;
export declare const JSON_V1_MAX_PATH_SEGMENTS = 8;
export declare const JSON_V1_MAX_PATH_SEGMENT_CODE_POINTS = 64;
export declare const JSON_V1_MAX_STATIC_NAME_CODE_POINTS = 80;
export declare const JSON_V1_MAX_STATIC_UNIT_CODE_POINTS = 32;
export declare const JSON_V1_MAX_DISPLAY_CODE_POINTS = 160;
export declare const JSON_V1_MAX_NUMBER_MAGNITUDE = 1000000000000000;
export declare function normalizeJsonV1Timestamp(value: unknown, encoding: JsonV1TimestampEncoding): string | null;
/** Validate and normalize the complete global-only quotaProviders array atomically. */
export declare function validateQuotaProviders(value: unknown): QuotaProvidersValidationResult;
export declare function cloneQuotaProviders(definitions: readonly QuotaProviderDefinition[]): QuotaProviderDefinition[];
export declare function findQuotaProviderDefinition(definitions: readonly QuotaProviderDefinition[], id: string): QuotaProviderDefinition | undefined;
export {};
//# sourceMappingURL=quota-providers.d.ts.map