import { isPercentEntry } from "./entries.js";
import { getQuotaProviderShape } from "./provider-metadata.js";
import { classifyQuotaWindowText } from "./quota-entry-display.js";
import { QUOTA_PROVIDERS_AGGREGATE_ID } from "./quota-providers.js";
const METER_NAME = "@slkiser/opencode-quota";
const CONSUMED_METRIC_NAME = "opencode.quota.consumed";
const CACHE_AGE_METRIC_NAME = "opencode.quota.cache.age";
const TELEMETRY_STATE_KEY = Symbol.for("@slkiser/opencode-quota/quota-telemetry/v2");
function defaultApiLoader() {
    return import("@opentelemetry/api");
}
function getState() {
    const globalState = globalThis;
    const existing = globalState[TELEMETRY_STATE_KEY];
    if (existing)
        return existing;
    const state = {
        owners: new WeakMap(),
        ownersById: new Map(),
        nextOwnerId: 1,
        snapshots: new Map(),
        initialization: null,
        unavailable: false,
        registered: false,
        apiLoader: defaultApiLoader,
    };
    globalState[TELEMETRY_STATE_KEY] = state;
    return state;
}
function safeProviderAttribute(providerId) {
    if (providerId === QUOTA_PROVIDERS_AGGREGATE_ID ||
        providerId.startsWith(`${QUOTA_PROVIDERS_AGGREGATE_ID}:`)) {
        return "custom";
    }
    return getQuotaProviderShape(providerId)?.id ?? "other";
}
function activeProviderId(providerId) {
    return providerId.startsWith(`${QUOTA_PROVIDERS_AGGREGATE_ID}:`)
        ? QUOTA_PROVIDERS_AGGREGATE_ID
        : providerId;
}
function observationKey(attributes) {
    return [
        attributes["quota.provider"],
        attributes["quota.window"],
        attributes["quota.result_type"],
    ].join("\u0000");
}
function snapshotKey(ownerId, identity) {
    return `${ownerId}\u0000${identity}`;
}
function removeOwnerSnapshots(state, ownerId) {
    const prefix = `${ownerId}\u0000`;
    for (const key of state.snapshots.keys()) {
        if (key.startsWith(prefix))
            state.snapshots.delete(key);
    }
}
function collectConsumedObservations(state) {
    const observations = new Map();
    for (const snapshot of state.snapshots.values()) {
        for (const observation of snapshot.consumed) {
            const key = observationKey(observation.attributes);
            const existing = observations.get(key);
            if (!existing || observation.value > existing.value) {
                observations.set(key, observation);
            }
        }
    }
    return [...observations.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([, observation]) => observation);
}
function collectCacheAgeObservations(state, now) {
    const observations = new Map();
    for (const snapshot of state.snapshots.values()) {
        if (snapshot.cacheTimestamp === undefined)
            continue;
        const provider = safeProviderAttribute(snapshot.providerId);
        const value = Math.max(0, now - snapshot.cacheTimestamp) / 1000;
        const existing = observations.get(provider);
        if (!existing || value > existing.value) {
            observations.set(provider, {
                value,
                attributes: { "quota.provider": provider },
            });
        }
    }
    return [...observations.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([, observation]) => observation);
}
function emitObservations(result, observations) {
    for (const observation of observations) {
        try {
            result.observe(observation.value, observation.attributes);
        }
        catch {
            // One host observer failure must not suppress other safe series.
        }
    }
}
function registerInstruments(state, api) {
    const meter = api.metrics.getMeter(METER_NAME);
    const consumedGauge = meter.createObservableGauge(CONSUMED_METRIC_NAME, {
        description: "Normalized quota consumed, where 1 is 100% consumed",
        unit: "1",
    });
    const cacheAgeGauge = meter.createObservableGauge(CACHE_AGE_METRIC_NAME, {
        description: "Age of the normalized cached quota observation",
        unit: "s",
    });
    const observeConsumed = (result) => {
        try {
            emitObservations(result, collectConsumedObservations(state));
        }
        catch {
            // Telemetry callbacks must never affect the host or quota collection.
        }
    };
    const observeCacheAge = (result) => {
        try {
            emitObservations(result, collectCacheAgeObservations(state, Date.now()));
        }
        catch {
            // Telemetry callbacks must never affect the host or quota collection.
        }
    };
    consumedGauge.addCallback(observeConsumed);
    try {
        cacheAgeGauge.addCallback(observeCacheAge);
    }
    catch (error) {
        consumedGauge.removeCallback?.(observeConsumed);
        throw error;
    }
    state.consumedGauge = consumedGauge;
    state.cacheAgeGauge = cacheAgeGauge;
    state.observeConsumed = observeConsumed;
    state.observeCacheAge = observeCacheAge;
    state.registered = true;
}
function initializeTelemetry(state) {
    if (state.registered || state.unavailable || state.initialization)
        return;
    state.initialization = state
        .apiLoader()
        .then((api) => registerInstruments(state, api))
        .catch(() => {
        state.unavailable = true;
    });
}
export function configureQuotaTelemetry(params) {
    try {
        const state = getState();
        let owner = state.owners.get(params.owner);
        if (!owner) {
            owner = {
                id: state.nextOwnerId,
                generation: 0,
                enabled: false,
                identity: "",
            };
            state.nextOwnerId += 1;
            state.owners.set(params.owner, owner);
            state.ownersById.set(owner.id, owner);
        }
        if (owner.enabled !== params.enabled || owner.identity !== params.identity) {
            owner.enabled = params.enabled;
            owner.identity = params.identity;
            owner.generation += 1;
            removeOwnerSnapshots(state, owner.id);
        }
        if (!owner.enabled)
            return undefined;
        initializeTelemetry(state);
        return { ownerId: owner.id, generation: owner.generation };
    }
    catch {
        // OpenTelemetry is optional and must not affect normal plugin behavior.
        return undefined;
    }
}
export function disposeQuotaTelemetryOwner(ownerKey) {
    try {
        const state = getState();
        const owner = state.owners.get(ownerKey);
        if (!owner)
            return;
        removeOwnerSnapshots(state, owner.id);
        state.owners.delete(ownerKey);
        state.ownersById.delete(owner.id);
    }
    catch {
        // Plugin disposal must remain best-effort.
    }
}
function isCurrentToken(state, token) {
    if (!token)
        return false;
    const owner = state.ownersById.get(token.ownerId);
    return Boolean(owner?.enabled && owner.generation === token.generation);
}
export function updateQuotaTelemetrySnapshot(params) {
    try {
        const state = getState();
        if (!isCurrentToken(state, params.token))
            return;
        for (const snapshotId of params.supersededSnapshotIds ?? []) {
            state.snapshots.delete(snapshotKey(params.token.ownerId, snapshotId));
        }
        const key = snapshotKey(params.token.ownerId, params.snapshotId);
        if (!params.result || !params.result.attempted || params.result.entries.length === 0) {
            state.snapshots.delete(key);
            return;
        }
        const provider = safeProviderAttribute(params.providerId);
        const consumed = new Map();
        for (const entry of params.result.entries) {
            if (!isPercentEntry(entry) || !Number.isFinite(entry.percentRemaining))
                continue;
            const attributes = {
                "quota.provider": provider,
                "quota.window": classifyQuotaWindowText(entry.label ?? "") ??
                    classifyQuotaWindowText(entry.name) ??
                    "unknown",
                "quota.result_type": entry.accounting.resultType,
            };
            const observation = {
                value: Math.min(1, Math.max(0, (100 - entry.percentRemaining) / 100)),
                attributes,
            };
            const observationIdentity = observationKey(attributes);
            const existing = consumed.get(observationIdentity);
            if (!existing || observation.value > existing.value) {
                consumed.set(observationIdentity, observation);
            }
        }
        if (consumed.size === 0) {
            state.snapshots.delete(key);
            return;
        }
        const existing = state.snapshots.get(key);
        if (existing?.cacheTimestamp !== undefined &&
            params.cacheTimestamp !== undefined &&
            params.cacheTimestamp < existing.cacheTimestamp) {
            return;
        }
        state.snapshots.set(key, {
            ownerId: params.token.ownerId,
            generation: params.token.generation,
            providerId: params.providerId,
            ...(params.cacheTimestamp !== undefined ? { cacheTimestamp: params.cacheTimestamp } : {}),
            consumed: [...consumed.entries()]
                .sort(([left], [right]) => left.localeCompare(right))
                .map(([, observation]) => observation),
        });
    }
    catch {
        // Snapshot publication is deliberately best-effort and synchronous.
    }
}
export function retainQuotaTelemetryProviders(params) {
    try {
        const state = getState();
        if (!isCurrentToken(state, params.token))
            return;
        const retained = new Set(params.providerIds);
        for (const [key, snapshot] of state.snapshots) {
            if (snapshot.ownerId === params.token.ownerId &&
                !retained.has(activeProviderId(snapshot.providerId))) {
                state.snapshots.delete(key);
            }
        }
    }
    catch {
        // Reconciliation is best-effort and must not affect provider selection.
    }
}
export async function __flushQuotaTelemetryInitializationForTests() {
    await getState().initialization;
}
export function __setQuotaTelemetryApiLoaderForTests(loader) {
    const state = getState();
    state.apiLoader = loader;
    state.initialization = null;
    state.unavailable = false;
}
export function __resetQuotaTelemetryForTests() {
    const globalState = globalThis;
    const state = globalState[TELEMETRY_STATE_KEY];
    if (state?.consumedGauge && state.observeConsumed) {
        state.consumedGauge.removeCallback?.(state.observeConsumed);
    }
    if (state?.cacheAgeGauge && state.observeCacheAge) {
        state.cacheAgeGauge.removeCallback?.(state.observeCacheAge);
    }
    delete globalState[TELEMETRY_STATE_KEY];
}
//# sourceMappingURL=quota-telemetry.js.map