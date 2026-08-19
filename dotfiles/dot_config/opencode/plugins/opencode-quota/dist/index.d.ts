/**
 * OpenCode Quota Plugin
 *
 * Shows quota status in OpenCode without LLM invocation.
 *
 * @packageDocumentation
 */
declare const pluginModule: {
    id: string;
    server: import("@opencode-ai/plugin").Plugin;
};
export default pluginModule;
export type { JsonV1Adapter, JsonV1Mapping, JsonV1Metric, JsonV1NumberSource, JsonV1Path, JsonV1TextSource, JsonV1TimestampEncoding, JsonV1TimestampSource, LocalEstimateQuotaProviderDefinition, LocalEstimateWindow, QuotaProviderDefinition, QuotaProviderRemoteFormat, RemoteApiQuotaProviderDefinition, } from "./lib/quota-providers.js";
export { QUOTA_PROVIDER_MODES, QUOTA_PROVIDER_REMOTE_FORMATS, QUOTA_PROVIDER_WINDOW_TYPES, validateQuotaProviders, } from "./lib/quota-providers.js";
export type { CopilotEnterpriseUsageResult, CopilotOrganizationUsageResult, CopilotQuotaResult, GoogleModelId, GoogleModelQuota, GoogleQuotaResult, MaintainerAnnouncementsConfig, MiniMaxResult, MiniMaxResultEntry, PricingSnapshotSource, QuotaToastConfig, SessionTokenScope, } from "./lib/types.js";
export { QuotaToastPlugin } from "./plugin.js";
//# sourceMappingURL=index.d.ts.map