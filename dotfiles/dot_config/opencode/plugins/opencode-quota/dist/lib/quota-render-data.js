import { getAnthropicNoDataMessage } from "../providers/anthropic.js";
import { getProviders } from "../providers/registry.js";
import { isPercentEntry } from "./entries.js";
import { formatGroupedHeader } from "./grouped-header-format.js";
import { getQuotaProviderDisplayLabel, getQuotaProviderIdsForRuntimeId, getQuotaProviderShape, } from "./provider-metadata.js";
import { classifyQuotaWindowText } from "./quota-entry-display.js";
import { getQuotaFormatStyleDefinition } from "./quota-format-style.js";
import { createQuotaProviderRuntimeContext } from "./quota-runtime-context.js";
import { fetchQuotaProviderResult } from "./quota-state.js";
import { retainQuotaTelemetryProviders } from "./quota-telemetry.js";
import { createRuntimeProviderIdResolver, } from "./runtime-provider-ids.js";
import { fetchSessionTokensForDisplay } from "./session-tokens.js";
async function getProviderAvailability(params) {
    try {
        return {
            provider: params.provider,
            ok: await params.provider.isAvailable(params.ctx),
        };
    }
    catch {
        return {
            provider: params.provider,
            ok: false,
            error: true,
        };
    }
}
export async function collectConcreteEnabledProviderIds(params) {
    const candidates = params.enabledProviders === "auto"
        ? params.providers
        : params.providers.filter((provider) => params.enabledProviders.includes(provider.id));
    const availability = await Promise.all(candidates.map((provider) => getProviderAvailability({ provider, ctx: params.ctx })));
    return availability.filter((item) => item.ok).map((item) => item.provider.id);
}
export function matchesQuotaProviderCurrentSelection(params) {
    const matchesCurrentModel = (model) => params.provider.matchesCurrentModel
        ? params.provider.matchesCurrentModel(model, {
            enabledProviders: params.enabledProviders ?? "auto",
            ...(params.quotaProviders ? { quotaProviders: params.quotaProviders } : {}),
            ...(params.currentProviderID ? { currentProviderID: params.currentProviderID } : {}),
        })
        : true;
    if (params.provider.id === "quota-providers") {
        if (params.currentModel)
            return matchesCurrentModel(params.currentModel);
        if (!params.currentProviderID)
            return false;
        return Boolean(params.quotaProviders?.some((source) => source.providerId === params.currentProviderID && source.modelIds === undefined));
    }
    if (params.currentProviderID) {
        const explicitId = params.currentProviderID.trim().toLowerCase();
        const catalogShape = getQuotaProviderShape(explicitId);
        if (catalogShape?.id === explicitId)
            return params.provider.id === catalogShape.id;
        const runtimeCandidates = getQuotaProviderIdsForRuntimeId(explicitId);
        if (runtimeCandidates.length === 1)
            return params.provider.id === runtimeCandidates[0];
        if (runtimeCandidates.length > 1) {
            if (!runtimeCandidates.some((candidate) => candidate === params.provider.id)) {
                return false;
            }
            if (!params.currentModel || !params.provider.matchesCurrentModel)
                return false;
            const qualifiedModel = params.currentModel.toLowerCase().startsWith(`${explicitId}/`)
                ? params.currentModel
                : `${explicitId}/${params.currentModel}`;
            return matchesCurrentModel(qualifiedModel);
        }
        return false;
    }
    return params.currentModel ? matchesCurrentModel(params.currentModel) : false;
}
function hasCurrentQuotaSelection(params) {
    return Boolean(params.currentModel || params.currentProviderID);
}
export async function resolveQuotaRenderSelection(params) {
    const { client, config, request } = params;
    let currentModel;
    let currentProviderID;
    if (config.onlyCurrentModel && request?.sessionMeta) {
        currentModel = request.sessionMeta.modelID;
        currentProviderID = request.sessionMeta.providerID;
    }
    const ctx = createQuotaProviderRuntimeContext({
        client,
        config,
        configMeta: params.configMeta,
        resolveRuntimeProviderIds: params.resolveRuntimeProviderIds ?? createRuntimeProviderIdResolver(client),
        session: {
            sessionMeta: {
                modelID: currentModel,
                providerID: currentProviderID,
            },
        },
    });
    if (!config.enabled)
        return null;
    const allProviders = params.providers ?? getProviders();
    const isAutoMode = config.enabledProviders === "auto";
    const providers = isAutoMode
        ? allProviders
        : allProviders.filter((provider) => config.enabledProviders.includes(provider.id));
    if (!isAutoMode && providers.length === 0) {
        retainQuotaTelemetryProviders({
            token: ctx.config.telemetryToken,
            providerIds: [],
        });
        return null;
    }
    const hasCurrentSelection = hasCurrentQuotaSelection({ currentModel, currentProviderID });
    const filteringByCurrentSelection = config.onlyCurrentModel && hasCurrentSelection;
    const waitingForCurrentSelection = config.onlyCurrentModel && !hasCurrentSelection;
    const filtered = filteringByCurrentSelection
        ? providers.filter((provider) => matchesQuotaProviderCurrentSelection({
            provider,
            currentModel,
            currentProviderID,
            enabledProviders: config.enabledProviders,
            quotaProviders: config.quotaProviders,
        }))
        : providers;
    return {
        isAutoMode,
        providers,
        filtered,
        ctx,
        currentModel,
        currentProviderID,
        filteringByCurrentSelection,
        waitingForCurrentSelection,
    };
}
async function fetchProviderWithCache(params) {
    const { provider, ctx, ttlMs } = params;
    return fetchQuotaProviderResult({
        provider,
        ctx,
        ttlMs,
        bypassCache: params.bypassCache,
    });
}
function makeProviderFetchFailure(provider) {
    return {
        attempted: true,
        entries: [],
        errors: [
            {
                label: getQuotaProviderDisplayLabel(provider.id),
                message: "Failed to read quota data",
            },
        ],
    };
}
export async function fetchProviderResults(params) {
    const settled = await Promise.allSettled(params.providers.map((provider) => fetchProviderWithCache({
        provider,
        ctx: params.ctx,
        ttlMs: params.ttlMs,
        bypassCache: params.bypassCache,
    })));
    return settled.map((result, index) => result.status === "fulfilled"
        ? result.value
        : makeProviderFetchFailure(params.providers[index]));
}
export async function collectQuotaStatusLiveProbes(params) {
    if (params.providers.length === 0) {
        return [];
    }
    let currentModel;
    let currentProviderID;
    if (params.config.onlyCurrentModel && params.request?.sessionMeta) {
        currentModel = params.request.sessionMeta.modelID;
        currentProviderID = params.request.sessionMeta.providerID;
    }
    const ctx = createQuotaProviderRuntimeContext({
        client: params.client,
        config: params.config,
        configMeta: params.configMeta,
        resolveRuntimeProviderIds: params.resolveRuntimeProviderIds ?? createRuntimeProviderIdResolver(params.client),
        session: {
            sessionMeta: {
                modelID: currentModel,
                providerID: currentProviderID,
            },
        },
    });
    const resultsByProviderId = new Map();
    const results = await Promise.all(params.providers.map((provider) => {
        let result = resultsByProviderId.get(provider.id);
        if (!result) {
            result = fetchProviderWithCache({
                provider,
                ctx,
                ttlMs: 0,
                bypassCache: true,
            }).catch(() => makeProviderFetchFailure(provider));
            resultsByProviderId.set(provider.id, result);
        }
        return result;
    }));
    return params.providers.map((provider, index) => ({
        providerId: provider.id,
        result: {
            ...results[index],
            entries: results[index].entries.map((entry) => ({ ...entry })),
            errors: results[index].errors.map((error) => ({ ...error })),
            ...(results[index].statusDetails
                ? { statusDetails: results[index].statusDetails.map((detail) => ({ ...detail })) }
                : {}),
            ...(results[index].rawDetails
                ? { rawDetails: results[index].rawDetails.map((detail) => ({ ...detail })) }
                : {}),
            ...(results[index].presentation
                ? { presentation: { ...results[index].presentation } }
                : {}),
        },
    }));
}
function stripSingleWindowEntryMeta(entry, showRight) {
    const { group: _group, label: _label, metricLabel: _metricLabel, ...withoutGroupLabel } = entry;
    if (showRight) {
        return { ...withoutGroupLabel };
    }
    const { right: _right, ...withoutRight } = withoutGroupLabel;
    return { ...withoutRight };
}
const SINGLE_WINDOW_PROJECTION_LABELS = {
    rpm: "RPM",
    five_hour: "5h",
    hour: "Hourly",
    week: "Weekly",
    day: "Daily",
    month: "Monthly",
    year: "Yearly",
    mcp: "MCP",
    code_review: "Code Review",
};
export function normalizeSingleWindowWindowLabel(value) {
    const kind = classifyQuotaWindowText(value ?? "");
    return kind ? SINGLE_WINDOW_PROJECTION_LABELS[kind] : null;
}
function buildSingleWindowName(params) {
    const providerText = params.entry.group?.trim() ||
        params.singleWindowDisplayName?.trim() ||
        params.entry.name.trim() ||
        "";
    const provider = formatGroupedHeader(providerText);
    const windowLabel = normalizeSingleWindowWindowLabel(params.entry.label) ??
        normalizeSingleWindowWindowLabel(params.entry.name);
    return windowLabel ? `${provider} ${windowLabel}` : provider;
}
function renameSingleWindowEntry(entry, name) {
    return { ...entry, name };
}
function suppressRedundantQuotaFamily(entry, redundantQuotaFamily) {
    if (!redundantQuotaFamily)
        return entry;
    const familySuffix = `: ${redundantQuotaFamily}`;
    const name = entry.name.endsWith(familySuffix)
        ? entry.name.slice(0, -familySuffix.length)
        : entry.name;
    return {
        ...entry,
        name,
        label: undefined,
        metricLabel: "Quota",
    };
}
function normalizeSingleWindowPresentation(presentation) {
    if (!presentation) {
        return undefined;
    }
    const legacyPresentation = presentation;
    const singleWindowDisplayName = typeof legacyPresentation.singleWindowDisplayName === "string"
        ? legacyPresentation.singleWindowDisplayName
        : typeof legacyPresentation.classicDisplayName === "string"
            ? legacyPresentation.classicDisplayName
            : undefined;
    const singleWindowShowRight = typeof legacyPresentation.singleWindowShowRight === "boolean"
        ? legacyPresentation.singleWindowShowRight
        : typeof legacyPresentation.classicShowRight === "boolean"
            ? legacyPresentation.classicShowRight
            : false;
    const classicStrategy = legacyPresentation.classicStrategy === "preserve"
        ? legacyPresentation.classicStrategy
        : undefined;
    const redundantQuotaFamily = typeof legacyPresentation.redundantQuotaFamily === "string"
        ? legacyPresentation.redundantQuotaFamily.trim()
        : "";
    return {
        ...(singleWindowDisplayName ? { singleWindowDisplayName } : {}),
        ...(singleWindowShowRight ? { singleWindowShowRight } : {}),
        ...(redundantQuotaFamily ? { redundantQuotaFamily } : {}),
        ...(classicStrategy ? { classicStrategy } : {}),
    };
}
function selectSingleWindowEntry(entries) {
    let selectedPercentEntry;
    for (const entry of entries) {
        if (!isPercentEntry(entry)) {
            continue;
        }
        if (!selectedPercentEntry || entry.percentRemaining < selectedPercentEntry.percentRemaining) {
            selectedPercentEntry = entry;
        }
    }
    return selectedPercentEntry ?? entries[0];
}
function selectSingleWindowEntries(entries) {
    if (!entries.some((entry) => entry.accounting.sourceId !== undefined)) {
        const selected = selectSingleWindowEntry(entries);
        return selected ? [selected] : [];
    }
    const entriesBySource = new Map();
    for (const entry of entries) {
        const sourceEntries = entriesBySource.get(entry.accounting.sourceId) ?? [];
        sourceEntries.push(entry);
        entriesBySource.set(entry.accounting.sourceId, sourceEntries);
    }
    return [...entriesBySource.values()].flatMap((sourceEntries) => {
        const selected = selectSingleWindowEntry(sourceEntries);
        return selected ? [selected] : [];
    });
}
function projectProviderResultToStyle(result, style) {
    const presentation = normalizeSingleWindowPresentation(result.presentation);
    const entries = result.entries.map((entry) => suppressRedundantQuotaFamily({ ...entry }, presentation?.redundantQuotaFamily));
    const definition = getQuotaFormatStyleDefinition(style);
    if (definition.projection === "allWindows") {
        return entries;
    }
    if (presentation?.classicStrategy === "preserve") {
        return entries.map((entry) => {
            const nameEntry = presentation.redundantQuotaFamily ? entry : { ...entry, group: undefined };
            return renameSingleWindowEntry(stripSingleWindowEntryMeta(entry, presentation?.singleWindowShowRight ?? false), buildSingleWindowName({
                entry: nameEntry,
                singleWindowDisplayName: presentation.singleWindowDisplayName ?? entry.name,
            }));
        });
    }
    return selectSingleWindowEntries(entries).map((selectedEntry) => renameSingleWindowEntry(stripSingleWindowEntryMeta(selectedEntry, presentation?.singleWindowShowRight ?? false), buildSingleWindowName({
        entry: selectedEntry,
        singleWindowDisplayName: presentation?.singleWindowDisplayName,
    })));
}
function getExplicitNoDataMessage(provider) {
    if (provider.id === "cursor") {
        return "No local usage yet";
    }
    if (provider.id === "anthropic") {
        return getAnthropicNoDataMessage();
    }
    return "Not configured";
}
function shouldSurfaceNoDataMessage(params) {
    const { provider, result, isAutoMode, activeProviderCount } = params;
    if (result.attempted || result.entries.length > 0 || result.errors.length > 0) {
        return false;
    }
    if (!isAutoMode) {
        return true;
    }
    return activeProviderCount === 1 && (provider.id === "anthropic" || provider.id === "cursor");
}
function buildExplicitProviderIssues(params) {
    if (!params.enabled || params.selection.isAutoMode)
        return [];
    const filteredIds = new Set(params.selection.filtered.map((provider) => provider.id));
    const activeIds = new Set(params.active.map((provider) => provider.id));
    const availabilityById = new Map(params.availability.map((item) => [item.provider.id, item.ok]));
    const errors = [];
    for (const provider of params.selection.providers) {
        if (activeIds.has(provider.id))
            continue;
        if (!filteredIds.has(provider.id)) {
            const detail = params.onlyCurrentModel && params.selection.currentModel
                ? `current model: ${params.selection.currentModel}`
                : "filtered";
            errors.push({
                kind: "intentional-filter",
                label: getQuotaProviderDisplayLabel(provider.id),
                message: `Skipped (${detail})`,
            });
            continue;
        }
        if (availabilityById.get(provider.id) === false) {
            errors.push({
                label: getQuotaProviderDisplayLabel(provider.id),
                message: "Unavailable (not detected)",
            });
        }
    }
    return errors;
}
function projectProviderResultsToStyle(results, style) {
    return results.flatMap((result) => projectProviderResultToStyle(result, style));
}
function packageQuotaRenderData(params) {
    if (params.entries.length === 0 && params.errors.length === 0 && !params.sessionTokens) {
        return null;
    }
    return {
        entries: params.entries,
        errors: params.errors,
        sessionTokens: params.sessionTokens,
    };
}
export async function collectQuotaRenderData(params) {
    const resolveRuntimeProviderIds = params.resolveRuntimeProviderIds ?? createRuntimeProviderIdResolver(params.client);
    const selection = await resolveQuotaRenderSelection({ ...params, resolveRuntimeProviderIds });
    if (!selection) {
        return {
            selection: null,
            availability: [],
            active: [],
            providerResults: [],
            attemptedAny: false,
            hasExplicitProviderIssues: false,
            data: null,
        };
    }
    if (selection.waitingForCurrentSelection) {
        retainQuotaTelemetryProviders({
            token: selection.ctx.config.telemetryToken,
            providerIds: [],
        });
        return {
            selection,
            availability: [],
            active: [],
            providerResults: [],
            attemptedAny: false,
            hasExplicitProviderIssues: false,
            data: null,
        };
    }
    const availability = await Promise.all(selection.filtered.map((provider) => getProviderAvailability({
        provider,
        ctx: selection.ctx,
    })));
    const active = availability.filter((item) => item.ok).map((item) => item.provider);
    retainQuotaTelemetryProviders({
        token: selection.ctx.config.telemetryToken,
        providerIds: active.map((provider) => provider.id),
    });
    const explicitProviderIssues = buildExplicitProviderIssues({
        selection,
        availability,
        active,
        enabled: params.surfaceExplicitProviderIssues,
        onlyCurrentModel: params.config.onlyCurrentModel,
    });
    if (active.length === 0) {
        return {
            selection,
            availability,
            active,
            providerResults: [],
            attemptedAny: false,
            hasExplicitProviderIssues: explicitProviderIssues.length > 0,
            data: packageQuotaRenderData({ entries: [], errors: explicitProviderIssues }),
        };
    }
    const results = await fetchProviderResults({
        providers: active,
        ctx: selection.ctx,
        ttlMs: params.config.minIntervalMs,
        bypassCache: params.bypassProviderCache,
    });
    const style = params.formatStyle ?? params.config.formatStyle;
    const entries = projectProviderResultsToStyle(results, style);
    const errors = results.flatMap((result) => result.errors);
    const attemptedAny = results.some((result) => result.attempted);
    let hasExplicitProviderIssues = false;
    for (let index = 0; index < active.length; index++) {
        const provider = active[index];
        const result = results[index];
        if (provider &&
            result &&
            shouldSurfaceNoDataMessage({
                provider,
                result,
                isAutoMode: selection.isAutoMode,
                activeProviderCount: active.length,
            })) {
            errors.push({
                label: getQuotaProviderDisplayLabel(provider.id),
                message: getExplicitNoDataMessage(provider),
            });
            if (!selection.isAutoMode) {
                hasExplicitProviderIssues = true;
            }
        }
    }
    errors.push(...explicitProviderIssues);
    hasExplicitProviderIssues ||= explicitProviderIssues.length > 0;
    let sessionTokens;
    let sessionTokenError;
    if (params.config.showSessionTokens && params.request?.sessionID) {
        const sessionTokenResult = await fetchSessionTokensForDisplay({
            enabled: params.config.showSessionTokens,
            sessionID: params.request.sessionID,
            scope: params.config.sessionTokenScope,
        });
        sessionTokens = sessionTokenResult.sessionTokens;
        sessionTokenError = sessionTokenResult.error;
    }
    const data = packageQuotaRenderData({ entries, errors, sessionTokens });
    let allWindowsData;
    let singleWindowData;
    if (params.includeAllWindowsData) {
        const allWindowsEntries = style === "allWindows" ? entries : projectProviderResultsToStyle(results, "allWindows");
        allWindowsData = packageQuotaRenderData({
            entries: allWindowsEntries,
            errors: [...errors],
            sessionTokens,
        });
        if (style === "allWindows") {
            singleWindowData = packageQuotaRenderData({
                entries: projectProviderResultsToStyle(results, "singleWindow"),
                errors: [...errors],
                sessionTokens,
            });
        }
    }
    return {
        selection,
        availability,
        active,
        providerResults: active.map((provider, index) => ({
            providerId: provider.id,
            result: results[index],
        })),
        attemptedAny,
        hasExplicitProviderIssues,
        data,
        allWindowsData,
        singleWindowData,
        sessionTokenError,
    };
}
//# sourceMappingURL=quota-render-data.js.map