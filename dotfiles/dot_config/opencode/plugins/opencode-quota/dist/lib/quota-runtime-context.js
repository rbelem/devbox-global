import { createHash } from "node:crypto";
import { getProviders } from "../providers/registry.js";
import { createLoadConfigMeta, loadConfig } from "./config.js";
import { resolveRuntimeContextRoots } from "./config-file-utils.js";
import { cloneQuotaProviders } from "./quota-providers.js";
import { configureQuotaTelemetry } from "./quota-telemetry.js";
import { createRuntimeProviderIdResolver, } from "./runtime-provider-ids.js";
export function shouldIncludeSessionMeta(params) {
    if (typeof params.includeSessionMeta === "function") {
        return params.includeSessionMeta(params.config);
    }
    return params.includeSessionMeta === true;
}
export async function resolveQuotaRuntimeContext(params) {
    const roots = resolveRuntimeContextRoots(params.roots);
    const configMeta = params.configMeta ?? createLoadConfigMeta();
    const config = params.config ??
        (await loadConfig(params.client, configMeta, {
            configRootDir: roots.configRoot,
        }));
    let sessionMeta = params.sessionMeta;
    if (!sessionMeta &&
        params.sessionID &&
        params.resolveSessionMeta &&
        shouldIncludeSessionMeta({
            config,
            includeSessionMeta: params.includeSessionMeta,
        })) {
        sessionMeta = await params.resolveSessionMeta(params.sessionID);
    }
    if (params.configureTelemetry !== false) {
        configureRuntimeTelemetry({
            client: params.client,
            config,
            session: { sessionMeta },
        });
    }
    return {
        client: params.client,
        roots,
        config,
        configMeta,
        providers: params.providers ?? getProviders(),
        resolveRuntimeProviderIds: createRuntimeProviderIdResolver(params.client),
        session: {
            sessionID: params.sessionID,
            sessionMeta,
        },
    };
}
export function createQuotaRuntimeRequestContext(runtime) {
    return {
        sessionID: runtime.session.sessionID,
        sessionMeta: runtime.session.sessionMeta,
    };
}
export function createQuotaProviderRuntimeContext(runtime) {
    const telemetryToken = runtime.configureTelemetry === false ? undefined : configureRuntimeTelemetry(runtime);
    return {
        client: runtime.client,
        resolveRuntimeProviderIds: runtime.resolveRuntimeProviderIds,
        config: {
            googleModels: runtime.config.googleModels,
            anthropicBinaryPath: runtime.config.anthropicBinaryPath,
            cursorPlan: runtime.config.cursorPlan,
            cursorIncludedApiUsd: runtime.config.cursorIncludedApiUsd,
            cursorBillingCycleStartDay: runtime.config.cursorBillingCycleStartDay,
            opencodeGoWindows: runtime.config.opencodeGoWindows,
            opencodeMonthlyLimit: runtime.config.opencodeMonthlyLimit,
            requestTimeoutMs: runtime.config.requestTimeoutMs,
            providerCacheTtlMs: runtime.config.minIntervalMs,
            requestTimeoutMsConfigured: Boolean(runtime.configMeta?.settingSources.requestTimeoutMs),
            onlyCurrentModel: runtime.config.onlyCurrentModel,
            enabledProviders: runtime.config.enabledProviders === "auto" ? "auto" : [...runtime.config.enabledProviders],
            quotaProviders: cloneQuotaProviders(runtime.config.quotaProviders),
            telemetryToken,
            currentModel: runtime.session.sessionMeta?.modelID,
            currentProviderID: runtime.session.sessionMeta?.providerID,
        },
    };
}
function configureRuntimeTelemetry(runtime) {
    const telemetryEnabled = runtime.config.enabled && runtime.config.telemetry?.enabled === true;
    const telemetryIdentity = createHash("sha256")
        .update(JSON.stringify([
        "quota-telemetry-config-v1",
        runtime.config.enabled,
        runtime.config.telemetry?.enabled === true,
        runtime.config.enabledProviders === "auto"
            ? "auto"
            : [...runtime.config.enabledProviders].sort(),
        runtime.config.quotaProviders,
        runtime.config.googleModels,
        runtime.config.anthropicBinaryPath,
        runtime.config.cursorPlan,
        runtime.config.cursorIncludedApiUsd,
        runtime.config.cursorBillingCycleStartDay,
        runtime.config.opencodeGoWindows,
        runtime.config.opencodeMonthlyLimit,
        runtime.config.onlyCurrentModel,
        runtime.session.sessionMeta?.providerID,
        runtime.session.sessionMeta?.modelID,
    ]))
        .digest("hex");
    return configureQuotaTelemetry({
        owner: runtime.client,
        enabled: telemetryEnabled,
        identity: telemetryIdentity,
    });
}
//# sourceMappingURL=quota-runtime-context.js.map