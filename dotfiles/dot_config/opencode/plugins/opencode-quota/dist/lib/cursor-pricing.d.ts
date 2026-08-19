import type { CostBuckets } from "./modelsdev-pricing.js";
import type { CursorQuotaPlan } from "./types.js";
export type CursorLocalPricingModel = "auto" | "composer-1" | "composer-1.5" | "composer-2" | "composer-2-fast";
export type CursorResolvedModel = {
    kind: "local";
    model: CursorLocalPricingModel;
    pool: "auto_composer";
} | {
    kind: "official";
    providerHint: string;
    modelHint: string;
    pool: "api";
} | {
    kind: "unknown";
};
export declare const CURSOR_PROVIDER_ID = "cursor";
export declare const CURSOR_LEGACY_PROVIDER_ID = "cursor-acp";
export declare const CURSOR_OPENCODE_PROVIDER_ID = "cursor-acp";
export declare const CURSOR_INCLUDED_API_USD_BY_PLAN: Readonly<Record<Exclude<CursorQuotaPlan, "none">, number>>;
export declare const CURSOR_OFFICIAL_MODEL_ALIASES: Readonly<Record<string, {
    providerHint: string;
    modelHint: string;
}>>;
export declare function isCursorProviderId(raw?: string): boolean;
export declare function isCursorModelId(raw?: string): boolean;
export declare function extractCursorModelPart(rawModelId: string): string;
export declare function getCursorPlanDisplayName(plan: CursorQuotaPlan): string | null;
export declare function getEffectiveCursorIncludedApiUsd(params: {
    plan: CursorQuotaPlan;
    overrideUsd?: number;
}): number | undefined;
export declare function lookupCursorLocalCost(model: string): CostBuckets | null;
export declare function resolveCursorModel(rawModelId?: string): CursorResolvedModel;
//# sourceMappingURL=cursor-pricing.d.ts.map