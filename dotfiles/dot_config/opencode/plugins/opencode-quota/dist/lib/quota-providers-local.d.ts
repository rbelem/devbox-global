import type { QuotaToastEntry } from "./entries.js";
import type { OpencodeRuntimeDirs } from "./opencode-runtime-paths.js";
import type { OpenCodeMessage } from "./opencode-storage.js";
import type { LocalEstimateQuotaProviderDefinition } from "./quota-providers.js";
import { type TokenBuckets } from "./token-buckets.js";
export declare const QUOTA_PROVIDER_LOCAL_STATE_VERSION: 1;
export interface LocalQuotaProviderMessage {
    id: string;
    atMs: number;
    providerId: string;
    modelId: string;
    tokens: TokenBuckets;
}
export interface LocalQuotaProviderStateV1 {
    version: typeof QUOTA_PROVIDER_LOCAL_STATE_VERSION;
    definitionId: string;
    providerId: string;
    updatedAt: number;
    messages: LocalQuotaProviderMessage[];
}
export type LocalQuotaProviderStateHealth = "missing" | "healthy" | "malformed" | "version_mismatch";
export interface LocalQuotaProviderStateDiagnostics {
    path: string;
    exists: boolean;
    health: LocalQuotaProviderStateHealth;
    version: number | null;
    lastUpdatedAt: number | null;
}
export interface LocalEstimateResult {
    entries: QuotaToastEntry[];
    state: LocalQuotaProviderStateV1;
    unpricedMessageCount: number;
}
interface LocalStateDependencies {
    nowMs?: number;
    runtimeDirs?: OpencodeRuntimeDirs;
    readMessages?: (params: {
        completedSinceMs: number;
        completedUntilMs: number;
    }) => Promise<OpenCodeMessage[]>;
    readText?: (path: string) => Promise<string>;
    writeState?: (path: string, state: LocalQuotaProviderStateV1) => Promise<void>;
}
export declare function getLocalQuotaProviderStatePath(definitionId: string, runtimeDirs?: OpencodeRuntimeDirs): string;
export declare function syncLocalQuotaProviderState(definition: LocalEstimateQuotaProviderDefinition, dependencies?: LocalStateDependencies): Promise<LocalQuotaProviderStateV1>;
export declare function computeLocalQuotaProviderEstimate(params: {
    definition: LocalEstimateQuotaProviderDefinition;
    state: LocalQuotaProviderStateV1;
    nowMs?: number;
}): LocalEstimateResult;
export declare function collectLocalQuotaProviderEstimate(definition: LocalEstimateQuotaProviderDefinition, dependencies?: LocalStateDependencies): Promise<LocalEstimateResult>;
export declare function inspectLocalQuotaProviderState(definition: LocalEstimateQuotaProviderDefinition, dependencies?: Pick<LocalStateDependencies, "runtimeDirs" | "readText">): Promise<LocalQuotaProviderStateDiagnostics>;
export declare function __resetLocalQuotaProviderStateForTests(): void;
export {};
//# sourceMappingURL=quota-providers-local.d.ts.map