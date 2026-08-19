import { type OpencodeRuntimeDirs } from "./opencode-runtime-paths.js";
import type { PricingSnapshotSource } from "./types.js";
export type CostBuckets = {
    input?: number;
    output?: number;
    cache_read?: number;
    cache_write?: number;
    reasoning?: number;
};
export type PricingSnapshot = {
    _meta: {
        source: string;
        generatedAt: number;
        providers: string[];
        units: string;
    };
    providers: Record<string, Record<string, CostBuckets>>;
};
export declare const DEFAULT_PRICING_SNAPSHOT_MAX_AGE_MS: number;
export type PricingSnapshotHealth = {
    generatedAt: number;
    ageMs: number;
    maxAgeMs: number;
    stale: boolean;
};
export interface PricingRefreshStateV1 {
    version: 1;
    updatedAt: number;
    lastAttemptAt?: number;
    lastSuccessAt?: number;
    lastFailureAt?: number;
    lastResult?: "success" | "not_modified" | "skipped_fresh" | "skipped_throttled" | "failed";
    lastError?: string;
    etag?: string;
    lastModified?: string;
}
export interface PricingRefreshPolicy {
    enabled: boolean;
    maxAgeMs: number;
    minAttemptIntervalMs: number;
    timeoutMs: number;
}
export interface PricingRefreshOptions {
    reason?: "init" | "tokens" | "status" | "manual";
    force?: boolean;
    nowMs?: number;
    maxAgeMs?: number;
    minAttemptIntervalMs?: number;
    timeoutMs?: number;
    runtimeDirs?: OpencodeRuntimeDirs;
    fetchFn?: typeof fetch;
    bootstrapSnapshotOverride?: PricingSnapshot;
    providerAllowlist?: string[];
    snapshotSelection?: PricingSnapshotSource;
    allowRefreshWhenSelectionBundled?: boolean;
}
export interface PricingRefreshResult {
    attempted: boolean;
    updated: boolean;
    state: PricingRefreshStateV1;
    error?: string;
    reason?: string;
}
export declare function getPricingRefreshPolicy(): PricingRefreshPolicy;
export declare function setPricingSnapshotAutoRefresh(days: number): void;
export declare function getRuntimePricingSnapshotPath(runtimeDirs?: OpencodeRuntimeDirs): string;
export declare function getRuntimePricingRefreshStatePath(runtimeDirs?: OpencodeRuntimeDirs): string;
export declare function readPricingRefreshState(runtimeDirs?: OpencodeRuntimeDirs): Promise<PricingRefreshStateV1 | null>;
export declare function maybeRefreshPricingSnapshot(opts?: PricingRefreshOptions): Promise<PricingRefreshResult>;
export declare function setPricingSnapshotSelection(selection: PricingSnapshotSource): void;
export declare function getPricingSnapshotSelection(): PricingSnapshotSource;
export declare function getPricingSnapshotMeta(): PricingSnapshot["_meta"];
export declare function getPricingSnapshotSource(): "runtime" | "bundled" | "empty";
export declare function getPricingSnapshotHealth(opts?: {
    nowMs?: number;
    maxAgeMs?: number;
}): PricingSnapshotHealth;
export declare function hasProvider(providerId: string): boolean;
export declare function isModelsDevProviderId(providerId: string): boolean;
export declare function hasModel(providerId: string, modelId: string): boolean;
/**
 * Infer the snapshot provider that owns a modelId.
 * Returns null when model is not found or is ambiguous across providers.
 */
export declare function inferProviderForModelId(modelId: string): string | null;
export declare function getProviderModelCount(providerId: string): number;
export declare function listProviders(): string[];
export declare function listModelsForProvider(providerId: string): string[];
export declare function listProvidersForModelId(modelId: string): string[];
export declare function lookupCost(providerId: string, modelId: string): CostBuckets | null;
export declare function hasCost(providerId: string, modelId: string): boolean;
export declare function __resetPricingSnapshotForTests(): void;
//# sourceMappingURL=modelsdev-pricing.d.ts.map