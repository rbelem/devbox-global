import type { OpenCodeMessage } from "./opencode-storage.js";
import type { AlibabaCodingPlanTier } from "./types.js";
export declare const QWEN_LOCAL_QUOTA_STATE_VERSION: 1;
export declare const ALIBABA_CODING_PLAN_STATE_VERSION: 1;
export declare const ALIBABA_CODING_PLAN_LIMITS: Readonly<Record<AlibabaCodingPlanTier, {
    fiveHour: number;
    weekly: number;
    monthly: number;
}>>;
export interface QwenLocalQuotaStateFileV1 {
    version: 1;
    utcDay: string;
    dayCount: number;
    recent: number[];
    updatedAt: number;
}
export interface AlibabaCodingPlanStateFileV1 {
    version: 1;
    recent: number[];
    updatedAt: number;
}
export interface QwenComputedQuota {
    day: {
        used: number;
        limit: number;
        percentRemaining: number;
        resetTimeIso: string;
    };
    rpm: {
        used: number;
        limit: number;
        percentRemaining: number;
        resetTimeIso?: string;
    };
}
interface RollingComputedQuotaWindow {
    used: number;
    limit: number;
    percentRemaining: number;
    resetTimeIso?: string;
}
export interface AlibabaCodingPlanComputedQuota {
    tier: AlibabaCodingPlanTier;
    fiveHour: RollingComputedQuotaWindow;
    weekly: RollingComputedQuotaWindow;
    monthly: RollingComputedQuotaWindow;
}
export declare function getQwenLocalQuotaPath(): string;
export declare function getAlibabaCodingPlanQuotaPath(): string;
interface MaintainedLocalQuotaDependencies {
    nowMs?: number;
    readMessages?: (params: {
        completedSinceMs: number;
        completedUntilMs: number;
    }) => Promise<OpenCodeMessage[]>;
    writeState?: (path: string, state: QwenLocalQuotaStateFileV1 | AlibabaCodingPlanStateFileV1) => Promise<void>;
}
export declare function readQwenLocalQuotaState(dependencies?: MaintainedLocalQuotaDependencies): Promise<QwenLocalQuotaStateFileV1>;
export declare function readAlibabaCodingPlanQuotaState(dependencies?: MaintainedLocalQuotaDependencies): Promise<AlibabaCodingPlanStateFileV1>;
export declare function computeQwenQuota(params: {
    state: QwenLocalQuotaStateFileV1;
    nowMs?: number;
    dayLimit?: number;
    rpmLimit?: number;
}): QwenComputedQuota;
export declare function computeAlibabaCodingPlanQuota(params: {
    state: AlibabaCodingPlanStateFileV1;
    tier: AlibabaCodingPlanTier;
    nowMs?: number;
    limits?: {
        fiveHour: number;
        weekly: number;
        monthly: number;
    };
}): AlibabaCodingPlanComputedQuota;
export {};
//# sourceMappingURL=qwen-local-quota.d.ts.map