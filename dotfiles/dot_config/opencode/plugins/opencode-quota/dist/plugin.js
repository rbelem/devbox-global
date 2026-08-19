/**
 * OpenCode Quota Toast Plugin
 *
 * Shows a minimal quota status toast without LLM invocation.
 * Triggers on session.idle, session.compacted, and question tool completion.
 * Supports GitHub Copilot and Google (via opencode-antigravity-auth).
 */
import { isMainThread } from "node:worker_threads";
import { tool } from "@opencode-ai/plugin";
import { DEFAULT_ALIBABA_AUTH_CACHE_MAX_AGE_MS, isAlibabaModelId, resolveAlibabaCodingPlanAuthCached, } from "./lib/alibaba-auth.js";
import { getOrFetchWithCacheControl } from "./lib/cache.js";
import { handled } from "./lib/command-handled.js";
import { shouldRegisterServerSlashCommands } from "./lib/command-surfaces.js";
import { createLoadConfigMeta } from "./lib/config.js";
import { findGitWorktreeRoot, getEffectiveConfigRoot } from "./lib/config-file-utils.js";
import { isCursorModelId, isCursorProviderId } from "./lib/cursor-pricing.js";
import { sanitizeDisplayText } from "./lib/display-sanitize.js";
import { formatQuotaRows } from "./lib/format.js";
import { BUNDLED_MAINTAINER_ANNOUNCEMENTS, formatMaintainerAnnouncementHomeCountLine, getMaintainerAnnouncementsSummary, } from "./lib/maintainer-announcements.js";
import { maybeRefreshPricingSnapshot, setPricingSnapshotAutoRefresh, setPricingSnapshotSelection, } from "./lib/modelsdev-pricing.js";
import { reconcileDetectedProvidersInGlobalConfig } from "./lib/opencode-config-providers.js";
import { buildQuotaDialogCommandOutput, isQuotaDialogCommand, QUOTA_DIALOG_COMMANDS, } from "./lib/quota-dialog-commands.js";
import { resolveQuotaFormatStyle } from "./lib/quota-format-style.js";
import { customQuotaProviderDefinitions, QUOTA_PROVIDERS_AGGREGATE_ID, } from "./lib/quota-providers.js";
import { collectQuotaRenderData } from "./lib/quota-render-data.js";
import { formatQuotaResetNotification, observeQuotaResetNotifications, } from "./lib/quota-reset-notifications.js";
import { createQuotaRuntimeRequestContext, resolveQuotaRuntimeContext, } from "./lib/quota-runtime-context.js";
import { disposeQuotaTelemetryOwner } from "./lib/quota-telemetry.js";
import { isQwenCodeModelId, resolveQwenLocalPlanCached } from "./lib/qwen-auth.js";
import { inspectTuiConfig } from "./lib/tui-config-diagnostics.js";
import { DEFAULT_CONFIG } from "./lib/types.js";
import { getProviders } from "./providers/registry.js";
function normalizeDefaultAgent(cfg) {
    if (!cfg?.default_agent || !cfg.agent || cfg.default_agent in cfg.agent)
        return;
    const stripped = (value) => value.replace(/[\u200B\u200C\u200D\uFEFF]/g, "");
    const target = stripped(cfg.default_agent);
    const matches = Object.keys(cfg.agent).filter((key) => stripped(key) === target);
    if (matches.length === 1) {
        cfg.default_agent = matches[0];
    }
}
const DEFERRED_QUOTA_REFRESH_DELAYS_MS = [3_000, 15_000, 60_000, 300_000];
// =============================================================================
// Plugin Implementation
// =============================================================================
/**
 * Main plugin export
 */
export const QuotaToastPlugin = async ({ client, directory }) => {
    const typedClient = client;
    let opencodeConfig = null;
    /**
     * Inject tool output directly into the session without triggering an LLM response.
     * This prevents models from summarizing/rewriting our carefully formatted reports.
     */
    async function injectRawOutput(sessionID, output, options = {}) {
        normalizeDefaultAgent(opencodeConfig);
        try {
            await typedClient.session.prompt({
                path: { id: sessionID },
                body: {
                    noReply: true,
                    // ignored=true keeps this out of future model context while still
                    // showing it to the user in the transcript.
                    parts: [{ type: "text", text: sanitizeDisplayText(output), ignored: true }],
                },
            });
        }
        catch (err) {
            // Log but don't fail by default - tool output can still be returned.
            await typedClient.app.log({
                body: {
                    service: "quota-toast",
                    level: "warn",
                    message: "Failed to inject raw output",
                    extra: { error: err instanceof Error ? err.message : String(err) },
                },
            });
            if (options.rethrow) {
                throw err;
            }
        }
    }
    // Keep init fast/non-blocking so TUI never hangs. We still want the first
    // toast trigger to work reliably, so we refresh config on-demand.
    let config = DEFAULT_CONFIG;
    let configLoaded = false;
    let configInFlight = null;
    let providerConfigReconcileQueue = Promise.resolve();
    let configMeta = createLoadConfigMeta();
    let runtimeProviders = getProviders();
    // Track last session token error for /quota_status diagnostics
    let lastSessionTokenError;
    const deferredQuotaRefreshes = new Map();
    const detectedProviderIdsByToastCacheKey = new Map();
    const maintainerAnnouncementToastFallback = {
        pending: true,
        inFlight: false,
    };
    function getDeferredQuotaRefreshDelayMs(attempts) {
        const index = Math.min(Math.max(0, attempts), DEFERRED_QUOTA_REFRESH_DELAYS_MS.length - 1);
        return DEFERRED_QUOTA_REFRESH_DELAYS_MS[index];
    }
    function clearDeferredQuotaRefresh(sessionID) {
        const state = deferredQuotaRefreshes.get(sessionID);
        if (state?.timer) {
            clearTimeout(state.timer);
        }
        deferredQuotaRefreshes.delete(sessionID);
    }
    function clearDeferredQuotaRefreshTimer(state) {
        if (!state.timer)
            return;
        clearTimeout(state.timer);
        state.timer = null;
    }
    function scheduleDeferredQuotaRefresh(params) {
        let state = deferredQuotaRefreshes.get(params.sessionID);
        if (!state) {
            state = {
                sessionID: params.sessionID,
                attempts: 0,
                reason: params.reason,
                queuedAtMs: Date.now(),
                timer: null,
                inFlight: false,
            };
            deferredQuotaRefreshes.set(params.sessionID, state);
        }
        else {
            if (params.incrementAttempts) {
                state.attempts += 1;
            }
            state.reason = params.reason;
            clearDeferredQuotaRefreshTimer(state);
        }
        const delayMs = getDeferredQuotaRefreshDelayMs(state.attempts);
        state.timer = setTimeout(() => {
            void runDeferredQuotaRefresh(params.sessionID);
        }, delayMs);
        state.timer.unref?.();
        void log("Deferred quota refresh scheduled", {
            sessionID: params.sessionID,
            reason: params.reason,
            attempts: state.attempts,
            delayMs,
        });
    }
    async function runDeferredQuotaRefresh(sessionID) {
        const state = deferredQuotaRefreshes.get(sessionID);
        if (!state || state.inFlight)
            return;
        await showQuotaToast(sessionID, "deferred.retry", { deferredRetry: true });
    }
    function isProviderEnabled(providerId) {
        return config.enabledProviders === "auto" || config.enabledProviders.includes(providerId);
    }
    async function shouldBypassToastCacheForLiveLocalUsage(params) {
        if (isProviderEnabled(QUOTA_PROVIDERS_AGGREGATE_ID) &&
            customQuotaProviderDefinitions(config.quotaProviders).some((definition) => definition.mode === "local-estimate")) {
            return true;
        }
        const currentSession = params.sessionMeta ?? (await getSessionModelMeta(params.sessionID));
        const currentModel = currentSession.modelID;
        if (currentSession.providerID === "qwen-code" || isQwenCodeModelId(currentModel)) {
            const plan = await resolveQwenLocalPlanCached();
            return plan.state === "qwen_free" && isProviderEnabled("qwen-code");
        }
        if (currentSession.providerID === "alibaba-coding-plan" ||
            currentSession.providerID === "alibaba" ||
            isAlibabaModelId(currentModel)) {
            const plan = await resolveAlibabaCodingPlanAuthCached({
                maxAgeMs: DEFAULT_ALIBABA_AUTH_CACHE_MAX_AGE_MS,
                fallbackTier: "lite",
            });
            return plan.state === "configured" && isProviderEnabled("alibaba-coding-plan");
        }
        if (isCursorProviderId(currentSession.providerID) || isCursorModelId(currentModel)) {
            return isProviderEnabled("cursor");
        }
        return false;
    }
    function getPluginRuntimeRootHints() {
        const cwd = directory || process.cwd();
        const workspaceRoot = findGitWorktreeRoot(cwd) ?? cwd;
        const configRoot = getEffectiveConfigRoot(workspaceRoot);
        return {
            workspaceRoot,
            configRoot,
            fallbackDirectory: cwd,
        };
    }
    function registerDeterministicSlashCommands(cfg) {
        cfg.command ??= {};
        for (const spec of QUOTA_DIALOG_COMMANDS) {
            cfg.command[spec.id] = {
                template: `/${spec.slashName}`,
                description: spec.description,
            };
        }
    }
    async function handleDeterministicSlashCommand(input) {
        const command = input.command;
        const result = await buildQuotaDialogCommandOutput({
            command,
            arguments: input.arguments,
            client: typedClient,
            roots: getPluginRuntimeRootHints(),
            sessionID: input.sessionID,
            resolveSessionMeta: (sessionID) => getSessionModelMeta(sessionID),
            lastSessionTokenError,
            setLastSessionTokenError: (error) => {
                lastSessionTokenError = error;
            },
            log,
        });
        if (result.state === "output") {
            await injectRawOutput(input.sessionID, result.output, { rethrow: true });
        }
        handled();
    }
    function triggerMaintainerAnnouncementToastFallback(trigger, detectedProviderIds) {
        if (!maintainerAnnouncementToastFallback.pending ||
            maintainerAnnouncementToastFallback.inFlight) {
            return;
        }
        if (!config.enabled || !config.enableToast) {
            maintainerAnnouncementToastFallback.pending = false;
            return;
        }
        if (!config.maintainerAnnouncements.enabled || !config.maintainerAnnouncements.home) {
            maintainerAnnouncementToastFallback.pending = false;
            return;
        }
        maintainerAnnouncementToastFallback.inFlight = true;
        void (async () => {
            try {
                const summary = getMaintainerAnnouncementsSummary({
                    announcements: BUNDLED_MAINTAINER_ANNOUNCEMENTS,
                    enabledProviders: detectedProviderIds,
                });
                if (summary.activeCount <= 0) {
                    if (summary.futureCount <= 0) {
                        maintainerAnnouncementToastFallback.pending = false;
                    }
                    return;
                }
                const tuiDiagnostics = await inspectTuiConfig({ roots: getPluginRuntimeRootHints() });
                if (tuiDiagnostics.quotaPluginConfigured) {
                    maintainerAnnouncementToastFallback.pending = false;
                    return;
                }
                const message = formatMaintainerAnnouncementHomeCountLine(summary.activeCount);
                if (!message) {
                    return;
                }
                await typedClient.tui.showToast({
                    body: {
                        message: sanitizeDisplayText(message),
                        variant: "info",
                        duration: config.toastDurationMs,
                    },
                });
                maintainerAnnouncementToastFallback.pending = false;
                await log("Displayed maintainer announcement fallback toast", { trigger });
            }
            catch (err) {
                await log("Failed to show maintainer announcement fallback toast", {
                    trigger,
                    error: err instanceof Error ? err.message : String(err),
                });
            }
            finally {
                maintainerAnnouncementToastFallback.inFlight = false;
            }
        })();
    }
    async function resolvePluginRuntimeContext(params = {}) {
        if (!configLoaded) {
            await refreshConfig();
        }
        return resolveQuotaRuntimeContext({
            client: typedClient,
            roots: getPluginRuntimeRootHints(),
            config,
            configMeta,
            providers: runtimeProviders,
            sessionID: params.sessionID,
            sessionMeta: params.sessionMeta,
            resolveSessionMeta: (sessionID) => getSessionModelMeta(sessionID),
            includeSessionMeta: params.includeSessionMeta,
        });
    }
    async function refreshConfig() {
        if (configInFlight)
            return configInFlight;
        configInFlight = (async () => {
            try {
                const runtime = await resolveQuotaRuntimeContext({
                    client: typedClient,
                    roots: getPluginRuntimeRootHints(),
                });
                configMeta = runtime.configMeta;
                config = runtime.config;
                runtimeProviders = runtime.providers;
                setPricingSnapshotAutoRefresh(config.pricingSnapshot.autoRefresh);
                setPricingSnapshotSelection(config.pricingSnapshot.source);
                configLoaded = true;
                onFirstConfigLoaded();
            }
            catch {
                // Leave configLoaded=false so we can retry on next trigger.
                config = DEFAULT_CONFIG;
                configMeta = createLoadConfigMeta();
                runtimeProviders = getProviders();
                setPricingSnapshotAutoRefresh(DEFAULT_CONFIG.pricingSnapshot.autoRefresh);
                setPricingSnapshotSelection(DEFAULT_CONFIG.pricingSnapshot.source);
            }
            finally {
                configInFlight = null;
            }
        })();
        return configInFlight;
    }
    async function kickPricingRefresh(params) {
        try {
            const refreshPromise = maybeRefreshPricingSnapshot({
                reason: params.reason,
                snapshotSelection: config.pricingSnapshot.source,
            });
            const guardedRefreshPromise = refreshPromise.catch(() => undefined);
            if (!params.maxWaitMs || params.maxWaitMs <= 0) {
                void guardedRefreshPromise;
                return;
            }
            await Promise.race([
                guardedRefreshPromise,
                new Promise((resolve) => {
                    setTimeout(resolve, params.maxWaitMs);
                }),
            ]);
        }
        catch (error) {
            await log("Pricing refresh failed", {
                reason: params.reason,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }
    // Deferred init: runs once after the first successful config load.
    // Avoids HTTP calls during plugin construction, which can interfere with
    // other plugins that are still being loaded (see #39).
    let initDone = false;
    function onFirstConfigLoaded() {
        if (initDone)
            return;
        initDone = true;
        if (config.enabled) {
            void kickPricingRefresh({ reason: "init" });
        }
        void typedClient.app
            .log({
            body: {
                service: "quota-toast",
                level: "info",
                message: "plugin initialized",
                extra: {
                    configLoaded,
                    configSource: configMeta.source,
                    configPaths: configMeta.paths,
                    enabledProviders: config.enabledProviders,
                    minIntervalMs: config.minIntervalMs,
                    googleModels: config.googleModels,
                    cursorPlan: config.cursorPlan,
                    cursorIncludedApiUsd: config.cursorIncludedApiUsd,
                    cursorBillingCycleStartDay: config.cursorBillingCycleStartDay,
                    pricingSnapshotSource: config.pricingSnapshot.source,
                    pricingSnapshotAutoRefresh: config.pricingSnapshot.autoRefresh,
                    showOnIdle: config.showOnIdle,
                    showOnQuestion: config.showOnQuestion,
                    showOnCompact: config.showOnCompact,
                    showOnBothFail: config.showOnBothFail,
                },
            },
        })
            .catch(() => { });
    }
    // If disabled in config, it'll be picked up on first trigger; we can't
    // reliably read config synchronously without risking TUI startup.
    /**
     * Log a message (debug level)
     */
    async function log(message, extra) {
        try {
            await typedClient.app.log({
                body: {
                    service: "quota-toast",
                    level: "debug",
                    message,
                    extra,
                },
            });
        }
        catch {
            // Ignore logging errors
        }
    }
    async function reconcileDetectedProviderConfig(providerIds) {
        if (!directory || providerIds.length === 0)
            return;
        const reconcile = async () => {
            try {
                const result = await reconcileDetectedProvidersInGlobalConfig({
                    configRootDir: getPluginRuntimeRootHints().configRoot,
                    detectedProviderIds: providerIds,
                });
                if (result.changed) {
                    await log("Added detected providers to global OpenCode config", {
                        path: result.path,
                        format: result.format,
                        providers: result.addedProviderIds,
                    });
                }
            }
            catch (error) {
                try {
                    await typedClient.app.log({
                        body: {
                            service: "quota-toast",
                            level: "warn",
                            message: "Failed to add detected providers to global OpenCode config",
                            extra: { error: error instanceof Error ? error.message : String(error) },
                        },
                    });
                }
                catch {
                    // Automatic config repair is best-effort and must not break quota output.
                }
            }
        };
        providerConfigReconcileQueue = providerConfigReconcileQueue.then(reconcile, reconcile);
        await providerConfigReconcileQueue;
    }
    /**
     * Check if session is a subagent session
     */
    async function isSubagentSession(sessionID) {
        try {
            const response = await typedClient.session.get({ path: { id: sessionID } });
            // Subagent sessions have a parentID
            return !!response.data?.parentID;
        }
        catch {
            // If we can't determine, assume it's a primary session
            return false;
        }
    }
    /**
     * Get the current model metadata from the active session.
     *
     * Only uses session-scoped model lookup. Does NOT fall back to
     * client.config.get() because that returns the global/default model
     * which can be stale across sessions.
     */
    async function getSessionModelMeta(sessionID) {
        if (!sessionID)
            return {};
        try {
            const sessionResp = await typedClient.session.get({ path: { id: sessionID } });
            return {
                modelID: sessionResp.data?.model?.id,
                providerID: sessionResp.data?.model?.providerID,
            };
        }
        catch {
            return {};
        }
    }
    function formatDebugInfo(params) {
        const availability = params.availability
            ? params.availability.map((x) => `${x.id}=${x.ok ? "ok" : "no"}`).join(" ")
            : "unknown";
        const providers = params.enabledProviders === "auto"
            ? "(auto)"
            : params.enabledProviders.length > 0
                ? params.enabledProviders.join(",")
                : "(none)";
        const modelPart = params.currentModel ? ` model=${params.currentModel}` : "";
        const paths = configMeta.paths.length > 0 ? configMeta.paths.join(" | ") : "(none)";
        return [
            `Quota Toast Debug (opencode-quota)`,
            `trigger=${params.trigger} reason=${params.reason}`,
            `configSource=${configMeta.source} paths=${paths}`,
            `enabled=${config.enabled} providers=${providers}${modelPart}`,
            `available=${availability}`,
        ].join("\n");
    }
    function buildToastCacheKey(params) {
        const formatStyle = resolveQuotaFormatStyle(config.formatStyle);
        const enabledProviders = config.enabledProviders === "auto" ? "auto" : config.enabledProviders.join(",");
        const googleModels = config.googleModels.join(",");
        const currentModel = config.onlyCurrentModel && params.sessionID ? (params.sessionMeta?.modelID ?? "") : "";
        const currentProviderID = config.onlyCurrentModel && params.sessionID ? (params.sessionMeta?.providerID ?? "") : "";
        return [
            `sessionID=${params.sessionID}`,
            `enabledProviders=${enabledProviders}`,
            `formatStyle=${formatStyle}`,
            `percentDisplayMode=${config.percentDisplayMode}`,
            `layout=${JSON.stringify(config.layout)}`,
            `showSessionTokens=${config.showSessionTokens ? "yes" : "no"}`,
            `onlyCurrentModel=${config.onlyCurrentModel ? "yes" : "no"}`,
            `currentModel=${currentModel}`,
            `currentProviderID=${currentProviderID}`,
            `anthropicBinaryPath=${config.anthropicBinaryPath}`,
            `googleModels=${googleModels}`,
            `cursorPlan=${config.cursorPlan}`,
            `cursorIncludedApiUsd=${config.cursorIncludedApiUsd ?? ""}`,
            `cursorBillingCycleStartDay=${config.cursorBillingCycleStartDay ?? ""}`,
        ].join("|");
    }
    function isProviderFetchFailureOnly(errors) {
        return (errors.length > 0 && errors.every((error) => error.message === "Failed to read quota data"));
    }
    async function fetchQuotaMessageResult(params) {
        // Ensure we have loaded config at least once. If load fails, we keep trying
        // on subsequent triggers and queue a deferred retry for toast paths.
        if (!configLoaded) {
            await refreshConfig();
        }
        if (!configLoaded) {
            return {
                message: config.debug
                    ? formatDebugInfo({
                        trigger: params.trigger,
                        reason: "config load failed",
                        enabledProviders: config.enabledProviders,
                    })
                    : null,
                cacheRenderedMessage: false,
                retryable: true,
                retryReason: "config_load_failed",
                hasQuotaRows: false,
                detectedProviderIds: [],
            };
        }
        if (!config.enabled) {
            return {
                message: config.debug
                    ? formatDebugInfo({ trigger: params.trigger, reason: "disabled", enabledProviders: [] })
                    : null,
                cacheRenderedMessage: false,
                retryable: false,
                hasQuotaRows: false,
                detectedProviderIds: [],
            };
        }
        if (config.enabledProviders !== "auto" && config.enabledProviders.length === 0) {
            return {
                message: config.debug
                    ? formatDebugInfo({
                        trigger: params.trigger,
                        reason: "enabledProviders empty",
                        enabledProviders: [],
                    })
                    : null,
                cacheRenderedMessage: false,
                retryable: false,
                hasQuotaRows: false,
                detectedProviderIds: [],
            };
        }
        const runtime = await resolvePluginRuntimeContext({
            sessionID: params.sessionID,
            sessionMeta: params.sessionMeta,
            includeSessionMeta: (config) => config.onlyCurrentModel,
        });
        const runtimeConfig = runtime.config;
        const quotaRequestContext = createQuotaRuntimeRequestContext(runtime);
        const quotaResult = await collectQuotaRenderData({
            client: runtime.client,
            resolveRuntimeProviderIds: runtime.resolveRuntimeProviderIds,
            config: runtimeConfig,
            configMeta: runtime.configMeta,
            request: quotaRequestContext,
            surfaceExplicitProviderIssues: true,
            formatStyle: resolveQuotaFormatStyle(runtimeConfig.formatStyle),
            bypassProviderCache: params.bypassProviderCache,
            providers: runtime.providers,
        });
        const { selection, availability, active, providerResults, attemptedAny, hasExplicitProviderIssues, data, } = quotaResult;
        let resetNotification;
        if (runtimeConfig.enableToast &&
            runtimeConfig.resetNotifications.enabled &&
            providerResults.length > 0) {
            try {
                const notices = await observeQuotaResetNotifications({
                    providers: providerResults,
                    windows: runtimeConfig.resetNotifications.windows,
                });
                resetNotification = formatQuotaResetNotification(notices) ?? undefined;
            }
            catch (error) {
                await log("Failed to observe quota reset transitions", {
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        }
        if (selection?.isAutoMode) {
            await reconcileDetectedProviderConfig(active.map((provider) => provider.id));
        }
        const detectedProviderIds = active.map((provider) => provider.id);
        if (runtimeConfig.showSessionTokens && params.sessionID) {
            lastSessionTokenError = quotaResult.sessionTokenError;
        }
        const currentModel = selection?.currentModel;
        const errors = data?.errors ?? [];
        const hasProviderQuotaRows = Boolean(data?.entries.length);
        const hasQuotaRows = Boolean(hasProviderQuotaRows || data?.sessionTokens);
        const providerFetchFailureOnly = attemptedAny && isProviderFetchFailureOnly(errors);
        const retryableAvailabilityFailure = active.length === 0 && availability.some((item) => !item.ok && item.error === true);
        if (active.length === 0 && !(hasExplicitProviderIssues && errors.length > 0)) {
            const message = runtimeConfig.debug
                ? formatDebugInfo({
                    trigger: params.trigger,
                    reason: "no enabled providers available",
                    currentModel,
                    enabledProviders: runtimeConfig.enabledProviders,
                    availability: availability.map((item) => ({
                        id: item.provider.id,
                        ok: item.ok,
                    })),
                })
                : null;
            const retryableNoProviders = selection?.isAutoMode === true || retryableAvailabilityFailure;
            return {
                message,
                cacheRenderedMessage: false,
                retryable: retryableNoProviders,
                retryReason: retryableNoProviders ? "no_available_providers" : undefined,
                hasQuotaRows: false,
                detectedProviderIds,
                resetNotification,
            };
        }
        if (hasQuotaRows) {
            const formatted = formatQuotaRows({
                version: "1.0.0",
                layout: runtimeConfig.layout,
                entries: data?.entries ?? [],
                errors: data?.errors ?? [],
                style: resolveQuotaFormatStyle(runtimeConfig.formatStyle),
                percentDisplayMode: runtimeConfig.percentDisplayMode,
                resetTimeDecimals: runtimeConfig.resetTimeDecimals,
                sessionTokens: data?.sessionTokens,
            });
            const retryableMaskedProviderFailure = !hasProviderQuotaRows && providerFetchFailureOnly;
            if (!runtimeConfig.debug) {
                return {
                    message: formatted,
                    cacheRenderedMessage: true,
                    retryable: retryableMaskedProviderFailure,
                    retryReason: retryableMaskedProviderFailure ? "provider_fetch_failed" : undefined,
                    hasQuotaRows: true,
                    detectedProviderIds,
                    resetNotification,
                };
            }
            const debugFooter = `\n\n[debug] src=${configMeta.source} providers=${runtimeConfig.enabledProviders === "auto" ? "(auto)" : runtimeConfig.enabledProviders.join(",") || "(none)"} avail=${availability
                .map((item) => `${item.provider.id}:${item.ok ? "ok" : "no"}`)
                .join(" ")}`;
            return {
                message: formatted + debugFooter,
                cacheRenderedMessage: false,
                retryable: retryableMaskedProviderFailure,
                retryReason: retryableMaskedProviderFailure ? "provider_fetch_failed" : undefined,
                hasQuotaRows: true,
                detectedProviderIds,
                resetNotification,
            };
        }
        // Show errors even without entries when:
        // 1. showOnBothFail is enabled and at least one provider attempted (existing behavior)
        // 2. OR we're in explicit mode and have "Not configured"/"Unavailable" errors (new behavior)
        if ((runtimeConfig.showOnBothFail && attemptedAny && errors.length > 0) ||
            hasExplicitProviderIssues) {
            const errorLines = errors.map((error) => `${error.label}: ${error.message}`).join("\n");
            const retryableFetchFailure = !hasExplicitProviderIssues && providerFetchFailureOnly;
            const retryableFailure = retryableFetchFailure || retryableAvailabilityFailure;
            const retryReason = retryableFetchFailure
                ? "provider_fetch_failed"
                : retryableAvailabilityFailure
                    ? "no_available_providers"
                    : undefined;
            const message = !runtimeConfig.debug
                ? errorLines || "Quota unavailable"
                : (errorLines || "Quota unavailable") +
                    "\n\n" +
                    formatDebugInfo({
                        trigger: params.trigger,
                        reason: hasExplicitProviderIssues
                            ? "providers missing/unavailable"
                            : "all providers failed",
                        currentModel,
                        enabledProviders: runtimeConfig.enabledProviders,
                        availability: availability.map((item) => ({
                            id: item.provider.id,
                            ok: item.ok,
                        })),
                    });
            return {
                message,
                cacheRenderedMessage: false,
                retryable: retryableFailure,
                retryReason,
                hasQuotaRows: false,
                detectedProviderIds,
                resetNotification,
            };
        }
        const retryableNoData = providerFetchFailureOnly ||
            (selection?.isAutoMode === true && active.length > 0 && errors.length === 0);
        return {
            message: runtimeConfig.debug
                ? formatDebugInfo({
                    trigger: params.trigger,
                    reason: "no entries",
                    currentModel,
                    enabledProviders: runtimeConfig.enabledProviders,
                    availability: availability.map((item) => ({
                        id: item.provider.id,
                        ok: item.ok,
                    })),
                })
                : null,
            cacheRenderedMessage: false,
            retryable: retryableNoData,
            retryReason: providerFetchFailureOnly
                ? "provider_fetch_failed"
                : retryableNoData
                    ? "no_reportable_data"
                    : undefined,
            hasQuotaRows: false,
            detectedProviderIds,
            resetNotification,
        };
    }
    async function reconcileDeferredQuotaRefresh(params) {
        const existing = deferredQuotaRefreshes.get(params.sessionID);
        if (!params.result.retryable) {
            if (existing) {
                clearDeferredQuotaRefresh(params.sessionID);
                await log("Deferred quota refresh cleared", {
                    sessionID: params.sessionID,
                    trigger: params.trigger,
                    reason: params.result.hasQuotaRows ? "quota_rows_available" : "not_retryable",
                });
            }
            return;
        }
        if (!params.result.retryReason) {
            return;
        }
        scheduleDeferredQuotaRefresh({
            sessionID: params.sessionID,
            reason: params.result.retryReason,
            incrementAttempts: params.consumedDeferredRetry,
        });
    }
    /**
     * Show quota toast for a session
     */
    async function showQuotaToast(sessionID, trigger, options = {}) {
        if (!configLoaded) {
            await refreshConfig();
        }
        const pendingDeferred = deferredQuotaRefreshes.get(sessionID);
        const consumedDeferredRetry = options.deferredRetry === true || Boolean(pendingDeferred);
        if (pendingDeferred) {
            if (pendingDeferred.inFlight && !options.deferredRetry) {
                await log("Skipping duplicate deferred quota refresh", { sessionID, trigger });
                return;
            }
            pendingDeferred.inFlight = true;
            clearDeferredQuotaRefreshTimer(pendingDeferred);
        }
        try {
            // Check if session is a subagent session
            if (await isSubagentSession(sessionID)) {
                if (consumedDeferredRetry) {
                    clearDeferredQuotaRefresh(sessionID);
                }
                await log("Skipping toast for subagent session", { sessionID, trigger });
                return;
            }
            // Get or fetch quota (with caching/throttling).
            // If debug is enabled, bypass caching so the toast reflects current state.
            const sessionMeta = await getSessionModelMeta(sessionID);
            const bypassForLiveLocalUsage = await shouldBypassToastCacheForLiveLocalUsage({
                sessionID,
                sessionMeta,
            });
            const bypassMessageCache = config.debug || consumedDeferredRetry || bypassForLiveLocalUsage;
            const bypassProviderCache = consumedDeferredRetry || bypassForLiveLocalUsage;
            const toastCacheKey = buildToastCacheKey({ sessionID, sessionMeta });
            let fetchResult;
            const fetchForToast = () => fetchQuotaMessageResult({
                trigger,
                sessionID,
                sessionMeta,
                bypassProviderCache,
            });
            const message = bypassMessageCache
                ? await (async () => {
                    fetchResult = await fetchForToast();
                    return fetchResult.message;
                })()
                : await (async () => {
                    const fetched = {};
                    const cachedMessage = await getOrFetchWithCacheControl(toastCacheKey, async () => {
                        const result = await fetchForToast();
                        fetched.result = result;
                        const cache = Boolean(result.message && result.cacheRenderedMessage && result.hasQuotaRows);
                        return { message: result.message, cache };
                    }, config.minIntervalMs);
                    fetchResult = fetched.result;
                    return cachedMessage;
                })();
            if (fetchResult) {
                detectedProviderIdsByToastCacheKey.set(toastCacheKey, [...fetchResult.detectedProviderIds]);
                await reconcileDeferredQuotaRefresh({
                    sessionID,
                    result: fetchResult,
                    consumedDeferredRetry,
                    trigger,
                });
            }
            if (options.deferredRetry && fetchResult && !fetchResult.hasQuotaRows) {
                await log("Deferred quota refresh did not produce reportable data", {
                    sessionID,
                    trigger,
                    retryable: fetchResult.retryable,
                    retryReason: fetchResult.retryReason,
                });
                return;
            }
            if (!message) {
                await log("No quota message to display", { trigger });
                return;
            }
            if (!config.enableToast) {
                await log("Toast disabled (enableToast=false)", { trigger });
                return;
            }
            // Show toast
            try {
                await typedClient.tui.showToast({
                    body: {
                        message: sanitizeDisplayText(message),
                        variant: "info",
                        duration: config.toastDurationMs,
                    },
                });
                triggerMaintainerAnnouncementToastFallback(trigger, fetchResult?.detectedProviderIds ??
                    detectedProviderIdsByToastCacheKey.get(toastCacheKey) ??
                    []);
                await log("Displayed quota toast", { message, trigger });
                if (fetchResult?.resetNotification) {
                    await typedClient.tui.showToast({
                        body: {
                            title: "Quota available",
                            message: sanitizeDisplayText(fetchResult.resetNotification),
                            variant: "success",
                            duration: config.toastDurationMs,
                        },
                    });
                    await log("Displayed quota reset notification", {
                        message: fetchResult.resetNotification,
                        trigger,
                    });
                }
            }
            catch (err) {
                await log("Failed to show toast", {
                    error: err instanceof Error ? err.message : String(err),
                });
            }
        }
        finally {
            const state = deferredQuotaRefreshes.get(sessionID);
            if (state && state === pendingDeferred) {
                state.inFlight = false;
            }
        }
    }
    // Return hook implementations
    return {
        dispose: async () => {
            disposeQuotaTelemetryOwner(typedClient);
        },
        config: async (input) => {
            const cfg = input;
            opencodeConfig = cfg;
            if (shouldRegisterServerSlashCommands({ isMainThread, argv: process.argv })) {
                registerDeterministicSlashCommands(cfg);
            }
            // Keep the config-time correction for #39. injectRawOutput repeats the
            // same correction after later config hooks have run to handle #169.
            normalizeDefaultAgent(cfg);
        },
        "command.execute.before": async (input) => {
            if (!isQuotaDialogCommand(input.command))
                return;
            await handleDeterministicSlashCommand(input);
        },
        tool: {
            quota_status: tool({
                description: "Diagnostics for toast + TUI + pricing + local storage (includes unknown pricing report).",
                args: {
                    refreshGoogleTokens: tool.schema
                        .boolean()
                        .optional()
                        .describe("If true, refresh Google Antigravity access tokens before reporting"),
                    skewMs: tool.schema
                        .number()
                        .int()
                        .min(0)
                        .optional()
                        .describe("Refresh tokens expiring within this window (ms). Default: 120000"),
                    force: tool.schema
                        .boolean()
                        .optional()
                        .describe("If true, refresh even if cached token looks valid"),
                },
                async execute(args, context) {
                    const result = await buildQuotaDialogCommandOutput({
                        command: "quota_status",
                        arguments: JSON.stringify({
                            refreshGoogleTokens: args.refreshGoogleTokens,
                            skewMs: args.skewMs,
                            force: args.force,
                        }),
                        client: typedClient,
                        roots: getPluginRuntimeRootHints(),
                        sessionID: context.sessionID,
                        resolveSessionMeta: (sessionID) => getSessionModelMeta(sessionID),
                        lastSessionTokenError,
                        log,
                        onDetectedProviderIds: reconcileDetectedProviderConfig,
                    });
                    if (result.state !== "output")
                        return "";
                    context.metadata({ title: "Quota Status" });
                    await injectRawOutput(context.sessionID, result.output);
                    return ""; // Empty return - output already injected with noReply
                },
            }),
        },
        // Event hook for session.idle and session.compacted
        event: async ({ event }) => {
            const sessionID = event.properties.sessionID;
            if (!sessionID)
                return;
            if (event.type !== "session.idle" && event.type !== "session.compacted") {
                return;
            }
            if (!configLoaded) {
                await refreshConfig();
            }
            if (!config.enabled) {
                clearDeferredQuotaRefresh(sessionID);
                return;
            }
            if (event.type === "session.idle" && config.showOnIdle) {
                await showQuotaToast(sessionID, "session.idle");
            }
            else if (event.type === "session.compacted" && config.showOnCompact) {
                await showQuotaToast(sessionID, "session.compacted");
            }
        },
        // Tool execute hook for question tool
        "tool.execute.after": async (input, _output) => {
            if (input.tool !== "question")
                return;
            if (!configLoaded) {
                await refreshConfig();
            }
            if (!config.enabled) {
                clearDeferredQuotaRefresh(input.sessionID);
                return;
            }
            if (config.showOnQuestion) {
                await showQuotaToast(input.sessionID, "question");
            }
        },
    };
};
//# sourceMappingURL=plugin.js.map