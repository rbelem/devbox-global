import type { TokenBuckets } from "./token-buckets.js";
export { SessionNotFoundError } from "./opencode-storage.js";
export type { TokenBuckets } from "./token-buckets.js";
export type PricedKey = {
    provider: string;
    model: string;
};
export type UnknownKey = {
    sourceProviderID: string;
    sourceModelID: string;
    mappedProvider?: string;
    mappedModel?: string;
    normalizedModelID?: string;
    providerCandidates?: string[];
    reason?: "missing_model" | "missing_provider" | "ambiguous_model";
};
export type PricingResolution = {
    ok: true;
    key: PricedKey;
    method: "source_provider" | "model_prefix" | "unique_model" | "alias_fallback" | "cursor_local" | "cursor_api_alias";
} | {
    ok: false;
    unknown: UnknownKey;
};
export type AggregateRow = {
    key: PricedKey;
    tokens: TokenBuckets;
    costUsd: number;
    messageCount: number;
};
export type SessionRow = {
    sessionID: string;
    title?: string;
    tokens: TokenBuckets;
    costUsd: number;
    messageCount: number;
};
export type SourceProviderRow = {
    providerID: string;
    tokens: TokenBuckets;
    costUsd: number;
    messageCount: number;
};
export type SourceModelRow = {
    sourceProviderID: string;
    sourceModelID: string;
    tokens: TokenBuckets;
    costUsd: number;
    messageCount: number;
};
export type UnknownRow = {
    key: UnknownKey;
    tokens: TokenBuckets;
    messageCount: number;
};
export type UnpricedKey = {
    sourceProviderID: string;
    sourceModelID: string;
    mappedProvider: string;
    mappedModel: string;
    reason: string;
};
export type UnpricedRow = {
    key: UnpricedKey;
    tokens: TokenBuckets;
    messageCount: number;
};
export type SessionTreeNode = {
    sessionID: string;
    parentID?: string;
    title?: string;
    depth: number;
};
export type AggregateResult = {
    window: {
        sinceMs?: number;
        untilMs?: number;
    };
    totals: {
        priced: TokenBuckets;
        unknown: TokenBuckets;
        unpriced: TokenBuckets;
        costUsd: number;
        messageCount: number;
        sessionCount: number;
    };
    bySourceProvider: SourceProviderRow[];
    bySourceModel: SourceModelRow[];
    byModel: AggregateRow[];
    bySession: SessionRow[];
    unknown: UnknownRow[];
    unpriced: UnpricedRow[];
};
export declare function resolvePricingKey(source: {
    providerID?: string;
    modelID?: string;
}): PricingResolution;
export declare function resolveSessionTree(rootSessionID: string): Promise<SessionTreeNode[]>;
export declare function aggregateUsage(params: {
    sinceMs?: number;
    untilMs?: number;
    sessionID?: string;
    sessionIDs?: string[];
}): Promise<AggregateResult>;
/**
 * Lightweight session token summary for toast display.
 * Returns per-model input/output totals for a single session.
 */
export type SessionTokenRow = {
    modelID: string;
    input: number;
    cachedInput: number;
    totalInput: number;
    output: number;
};
export type SessionTokenSummary = {
    sessionID: string;
    models: SessionTokenRow[];
    totalInput: number;
    totalCachedInput: number;
    totalCombinedInput: number;
    totalOutput: number;
};
export declare function getSessionTokenSummary(sessionID: string): Promise<SessionTokenSummary | null>;
export declare function getSessionTreeTokenSummary(rootSessionID: string): Promise<SessionTokenSummary | null>;
//# sourceMappingURL=quota-stats.d.ts.map