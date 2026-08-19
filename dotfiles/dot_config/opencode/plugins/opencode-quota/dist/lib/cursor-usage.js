import { isCursorModelId, isCursorProviderId, lookupCursorLocalCost, resolveCursorModel, } from "./cursor-pricing.js";
import { lookupCost } from "./modelsdev-pricing.js";
import { iterAssistantMessages } from "./opencode-storage.js";
import { resolvePricingKey } from "./quota-stats.js";
import { addTokenBuckets, emptyTokenBuckets, tokenBucketsFromMessage } from "./token-buckets.js";
import { calculateUsdFromTokenBuckets } from "./token-cost.js";
function emptyUsageBucket() {
    return { costUsd: 0, tokens: emptyTokenBuckets(), messageCount: 0 };
}
function accumulateBucket(bucket, tokens, costUsd) {
    bucket.tokens = addTokenBuckets(bucket.tokens, tokens);
    bucket.costUsd += costUsd;
    bucket.messageCount += 1;
}
function accumulateKnownUsage(params) {
    accumulateBucket(params.bucket, params.tokens, params.costUsd);
    accumulateBucket(params.total, params.tokens, params.costUsd);
}
function accumulateUnknownModelUsage(bucket, total, sourceModelID, tokens) {
    total.tokens = addTokenBuckets(total.tokens, tokens);
    total.messageCount += 1;
    const existing = bucket.get(sourceModelID);
    if (existing) {
        existing.tokens = addTokenBuckets(existing.tokens, tokens);
        existing.messageCount += 1;
        return;
    }
    bucket.set(sourceModelID, { sourceModelID, messageCount: 1, tokens });
}
function isCursorMessage(msg) {
    return isCursorProviderId(msg.providerID) || isCursorModelId(msg.modelID);
}
export function computeCursorCycleWindow(params) {
    const nowMs = params?.nowMs ?? Date.now();
    const now = new Date(nowMs);
    const day = params?.billingCycleStartDay;
    if (typeof day === "number" && Number.isInteger(day) && day >= 1 && day <= 28) {
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), day);
        const start = nowMs >= currentMonthStart.getTime()
            ? currentMonthStart
            : new Date(now.getFullYear(), now.getMonth() - 1, day);
        const reset = new Date(start.getFullYear(), start.getMonth() + 1, day);
        return {
            sinceMs: start.getTime(),
            untilMs: reset.getTime(),
            resetTimeIso: reset.toISOString(),
            source: "configured_day",
        };
    }
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const reset = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return {
        sinceMs: start.getTime(),
        untilMs: reset.getTime(),
        resetTimeIso: reset.toISOString(),
        source: "calendar_month",
    };
}
export async function getCurrentCursorUsageSummary(params) {
    const nowMs = params?.nowMs ?? Date.now();
    const window = computeCursorCycleWindow({
        nowMs,
        billingCycleStartDay: params?.billingCycleStartDay,
    });
    const messages = await iterAssistantMessages({ sinceMs: window.sinceMs, untilMs: nowMs });
    const api = emptyUsageBucket();
    const autoComposer = emptyUsageBucket();
    const total = emptyUsageBucket();
    const unknownModels = new Map();
    for (const msg of messages) {
        if (!isCursorMessage(msg))
            continue;
        const sourceModelID = msg.modelID ?? "unknown";
        const tokens = tokenBucketsFromMessage(msg);
        const resolved = resolveCursorModel(sourceModelID);
        if (resolved.kind === "local") {
            const cost = lookupCursorLocalCost(resolved.model);
            if (!cost)
                continue;
            const costUsd = calculateUsdFromTokenBuckets(cost, tokens);
            accumulateKnownUsage({ bucket: autoComposer, total, tokens, costUsd });
            continue;
        }
        if (resolved.kind === "official") {
            const mapped = resolvePricingKey({
                providerID: resolved.providerHint,
                modelID: `${resolved.providerHint}/${resolved.modelHint}`,
            });
            if (mapped.ok) {
                const cost = lookupCost(mapped.key.provider, mapped.key.model);
                if (cost) {
                    const costUsd = calculateUsdFromTokenBuckets(cost, tokens);
                    accumulateKnownUsage({ bucket: api, total, tokens, costUsd });
                    continue;
                }
            }
        }
        accumulateUnknownModelUsage(unknownModels, total, sourceModelID, tokens);
    }
    return {
        window,
        api,
        autoComposer,
        total,
        unknownModels: [...unknownModels.values()].sort((a, b) => b.messageCount - a.messageCount),
    };
}
//# sourceMappingURL=cursor-usage.js.map