import type { TokenBuckets } from "./quota-stats.js";
export interface CursorCycleWindow {
    sinceMs: number;
    untilMs: number;
    resetTimeIso: string;
    source: "configured_day" | "calendar_month";
}
export interface CursorUsageBucket {
    costUsd: number;
    tokens: TokenBuckets;
    messageCount: number;
}
export interface CursorUsageSummary {
    window: CursorCycleWindow;
    api: CursorUsageBucket;
    autoComposer: CursorUsageBucket;
    total: CursorUsageBucket;
    unknownModels: Array<{
        sourceModelID: string;
        messageCount: number;
        tokens: TokenBuckets;
    }>;
}
export declare function computeCursorCycleWindow(params?: {
    nowMs?: number;
    billingCycleStartDay?: number;
}): CursorCycleWindow;
export declare function getCurrentCursorUsageSummary(params?: {
    nowMs?: number;
    billingCycleStartDay?: number;
}): Promise<CursorUsageSummary>;
//# sourceMappingURL=cursor-usage.d.ts.map