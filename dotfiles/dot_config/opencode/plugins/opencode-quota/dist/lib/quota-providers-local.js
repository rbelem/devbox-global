import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { writeJsonAtomic } from "./atomic-json.js";
import { lookupCost } from "./modelsdev-pricing.js";
import { getOpencodeRuntimeDirs } from "./opencode-runtime-paths.js";
import { iterCompletedAssistantMessages } from "./opencode-storage.js";
import { resolvePricingKey } from "./quota-stats.js";
import { tokenBucketsFromMessage } from "./token-buckets.js";
import { calculateUsdFromTokenBuckets } from "./token-cost.js";
export const QUOTA_PROVIDER_LOCAL_STATE_VERSION = 1;
const LOCAL_STATE_DIR = "opencode-quota/quota-providers";
const DAY_MS = 24 * 60 * 60 * 1000;
function hasOnlyKeys(value, allowed) {
    const allowedSet = new Set(allowed);
    return Object.keys(value).every((key) => allowedSet.has(key));
}
function asRecord(value) {
    return value && typeof value === "object" && !Array.isArray(value)
        ? value
        : null;
}
function isTokenBuckets(value) {
    const record = asRecord(value);
    if (!record ||
        !hasOnlyKeys(record, ["input", "output", "reasoning", "cache_read", "cache_write"])) {
        return false;
    }
    return ["input", "output", "reasoning", "cache_read", "cache_write"].every((key) => typeof record[key] === "number" && Number.isFinite(record[key]) && Number(record[key]) >= 0);
}
function normalizeMessage(value) {
    const record = asRecord(value);
    if (!record ||
        !hasOnlyKeys(record, ["id", "atMs", "providerId", "modelId", "tokens"]) ||
        typeof record.id !== "string" ||
        record.id.length === 0 ||
        typeof record.atMs !== "number" ||
        !Number.isFinite(record.atMs) ||
        record.atMs <= 0 ||
        typeof record.providerId !== "string" ||
        record.providerId.length === 0 ||
        typeof record.modelId !== "string" ||
        record.modelId.length === 0 ||
        !isTokenBuckets(record.tokens)) {
        return null;
    }
    return {
        id: record.id,
        atMs: Math.trunc(record.atMs),
        providerId: record.providerId,
        modelId: record.modelId,
        tokens: { ...record.tokens },
    };
}
function normalizeState(value, definition) {
    const record = asRecord(value);
    if (!record)
        return { state: emptyState(definition, 0), health: "malformed" };
    if (record.version !== QUOTA_PROVIDER_LOCAL_STATE_VERSION) {
        return { state: emptyState(definition, 0), health: "version_mismatch" };
    }
    if (!hasOnlyKeys(record, ["version", "definitionId", "providerId", "updatedAt", "messages"]) ||
        record.definitionId !== definition.id ||
        record.providerId !== definition.providerId ||
        typeof record.updatedAt !== "number" ||
        !Number.isFinite(record.updatedAt) ||
        record.updatedAt < 0 ||
        !Array.isArray(record.messages)) {
        return { state: emptyState(definition, 0), health: "malformed" };
    }
    const messages = [];
    for (const value of record.messages) {
        const message = normalizeMessage(value);
        if (!message)
            return { state: emptyState(definition, 0), health: "malformed" };
        messages.push(message);
    }
    return {
        state: {
            version: QUOTA_PROVIDER_LOCAL_STATE_VERSION,
            definitionId: definition.id,
            providerId: definition.providerId,
            updatedAt: Math.trunc(record.updatedAt),
            messages,
        },
        health: "healthy",
    };
}
function emptyState(definition, updatedAt) {
    return {
        version: QUOTA_PROVIDER_LOCAL_STATE_VERSION,
        definitionId: definition.id,
        providerId: definition.providerId,
        updatedAt,
        messages: [],
    };
}
export function getLocalQuotaProviderStatePath(definitionId, runtimeDirs = getOpencodeRuntimeDirs()) {
    return join(runtimeDirs.stateDir, LOCAL_STATE_DIR, `${definitionId}.json`);
}
function utcDayStart(nowMs) {
    const now = new Date(nowMs);
    return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}
function windowStart(window, nowMs) {
    return window.type === "utc-day"
        ? utcDayStart(nowMs)
        : nowMs - window.durationMinutes * 60 * 1000;
}
function retentionStart(definition, nowMs) {
    return Math.min(...definition.windows.map((window) => windowStart(window, nowMs)));
}
function messageTimestamp(message) {
    const value = message.time?.completed;
    return typeof value === "number" && Number.isFinite(value) && value > 0
        ? Math.trunc(value)
        : null;
}
function matchesDefinition(definition, message) {
    return (message.role === "assistant" &&
        message.providerID === definition.providerId &&
        typeof message.modelID === "string" &&
        (definition.modelIds === undefined || definition.modelIds.includes(message.modelID)));
}
function toStateMessage(message) {
    const atMs = messageTimestamp(message);
    if (!atMs || !message.providerID || !message.modelID || !message.id)
        return null;
    return {
        id: message.id,
        atMs,
        providerId: message.providerID,
        modelId: message.modelID,
        tokens: tokenBucketsFromMessage(message),
    };
}
export async function syncLocalQuotaProviderState(definition, dependencies = {}) {
    const nowMs = dependencies.nowMs ?? Date.now();
    const path = getLocalQuotaProviderStatePath(definition.id, dependencies.runtimeDirs);
    const readMessages = dependencies.readMessages ??
        ((params) => iterCompletedAssistantMessages({
            completedSinceMs: params.completedSinceMs,
            completedUntilMs: params.completedUntilMs,
        }));
    const writeState = dependencies.writeState ??
        ((target, state) => writeJsonAtomic(target, state, { trailingNewline: true }));
    const completedSinceMs = retentionStart(definition, nowMs);
    const fresh = await readMessages({ completedSinceMs, completedUntilMs: nowMs });
    const byId = new Map();
    for (const raw of fresh) {
        if (!matchesDefinition(definition, raw))
            continue;
        const message = toStateMessage(raw);
        if (message && message.atMs >= completedSinceMs && message.atMs <= nowMs) {
            byId.set(message.id, message);
        }
    }
    const next = {
        version: QUOTA_PROVIDER_LOCAL_STATE_VERSION,
        definitionId: definition.id,
        providerId: definition.providerId,
        updatedAt: nowMs,
        messages: [...byId.values()].sort((left, right) => left.atMs - right.atMs || left.id.localeCompare(right.id)),
    };
    await writeState(path, next);
    return next;
}
function resolveMessageCost(definition, message) {
    const automatic = resolvePricingKey({
        providerID: message.providerId,
        modelID: message.modelId,
    });
    if (automatic.ok) {
        const rates = lookupCost(automatic.key.provider, automatic.key.model);
        return rates ? calculateUsdFromTokenBuckets(rates, message.tokens) : null;
    }
    const manual = definition.pricingModelMap?.[message.modelId];
    if (!manual)
        return null;
    const slash = manual.indexOf("/");
    const rates = lookupCost(manual.slice(0, slash), manual.slice(slash + 1));
    return rates ? calculateUsdFromTokenBuckets(rates, message.tokens) : null;
}
function nextUtcMidnight(nowMs) {
    return new Date(utcDayStart(nowMs) + DAY_MS).toISOString();
}
function rollingReset(messages, window) {
    const oldest = messages[0];
    return oldest
        ? new Date(oldest.atMs + window.durationMinutes * 60 * 1000).toISOString()
        : undefined;
}
function formatUsd(value) {
    return `$${value.toFixed(2)}`;
}
function percentRemaining(used, limit) {
    return Math.max(0, Math.min(100, ((limit - used) / limit) * 100));
}
export function computeLocalQuotaProviderEstimate(params) {
    const nowMs = params.nowMs ?? Date.now();
    const entries = [];
    let totalUnpriced = 0;
    for (const window of params.definition.windows) {
        const sinceMs = windowStart(window, nowMs);
        const messages = params.state.messages.filter((message) => message.atMs >= sinceMs && message.atMs <= nowMs);
        const resetTimeIso = window.type === "utc-day" ? nextUtcMidnight(nowMs) : rollingReset(messages, window);
        entries.push({
            accounting: {
                resultType: "rate_limit",
                acquisitionMethod: "local_estimation",
                ownership: "user_configured",
                authority: "locally_derived",
                sourceId: params.definition.id,
                observedAtIso: new Date(params.state.updatedAt).toISOString(),
            },
            kind: "percent",
            name: `${params.definition.label} ${window.label}`,
            group: params.definition.label,
            label: `${window.label}:`,
            right: `${messages.length}/${window.requestLimit}`,
            percentRemaining: percentRemaining(messages.length, window.requestLimit),
            ...(resetTimeIso ? { resetTimeIso } : {}),
        });
        if (window.usdBudget === undefined)
            continue;
        let costUsd = 0;
        let unpriced = 0;
        for (const message of messages) {
            const cost = resolveMessageCost(params.definition, message);
            if (cost === null)
                unpriced += 1;
            else
                costUsd += cost;
        }
        totalUnpriced += unpriced;
        const common = {
            accounting: {
                resultType: "budget",
                acquisitionMethod: "local_estimation",
                ownership: "user_configured",
                authority: "locally_derived",
                sourceId: params.definition.id,
                observedAtIso: new Date(params.state.updatedAt).toISOString(),
            },
            name: `${params.definition.label} ${window.label} budget`,
            group: params.definition.label,
            label: `${window.label} budget:`,
            ...(resetTimeIso ? { resetTimeIso } : {}),
        };
        if (unpriced > 0) {
            entries.push({
                ...common,
                kind: "value",
                value: `Unavailable (${unpriced} unpriced request${unpriced === 1 ? "" : "s"})`,
            });
        }
        else {
            entries.push({
                ...common,
                kind: "percent",
                right: `${formatUsd(costUsd)}/${formatUsd(window.usdBudget)}`,
                percentRemaining: percentRemaining(costUsd, window.usdBudget),
            });
        }
    }
    return { entries, state: params.state, unpricedMessageCount: totalUnpriced };
}
export async function collectLocalQuotaProviderEstimate(definition, dependencies = {}) {
    const state = await syncLocalQuotaProviderState(definition, dependencies);
    return computeLocalQuotaProviderEstimate({
        definition,
        state,
        ...(dependencies.nowMs !== undefined ? { nowMs: dependencies.nowMs } : {}),
    });
}
export async function inspectLocalQuotaProviderState(definition, dependencies = {}) {
    const path = getLocalQuotaProviderStatePath(definition.id, dependencies.runtimeDirs);
    const readText = dependencies.readText ?? ((target) => readFile(target, "utf8"));
    try {
        const raw = JSON.parse(await readText(path));
        const record = asRecord(raw);
        const version = typeof record?.version === "number" ? record.version : null;
        const normalized = normalizeState(raw, definition);
        let lastUpdatedAt = null;
        try {
            const fileStats = await stat(path);
            lastUpdatedAt =
                normalized.health === "healthy" ? normalized.state.updatedAt : fileStats.mtimeMs;
        }
        catch {
            lastUpdatedAt = normalized.health === "healthy" ? normalized.state.updatedAt : null;
        }
        return {
            path,
            exists: true,
            health: normalized.health,
            version,
            lastUpdatedAt,
        };
    }
    catch (error) {
        if (error &&
            typeof error === "object" &&
            "code" in error &&
            String(error.code) === "ENOENT") {
            return { path, exists: false, health: "missing", version: null, lastUpdatedAt: null };
        }
        return { path, exists: true, health: "malformed", version: null, lastUpdatedAt: null };
    }
}
export function __resetLocalQuotaProviderStateForTests() {
    // Local state is derived from authoritative OpenCode storage; no mutation queue exists.
}
//# sourceMappingURL=quota-providers-local.js.map