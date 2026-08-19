/**
 * Configuration loader for opencode-quota plugin.
 *
 * Precedence model:
 * - Global/user config provides defaults.
 * - Workspace config at the resolved config root overrides ordinary settings.
 * - SDK config is used only as a fallback when no file-backed config exists.
 */
import type { QuotaToastConfig } from "./types.js";
export declare const QUOTA_TOAST_CONFIG_RELATIVE_PATHS: readonly ["opencode-quota/quota-toast.jsonc", "opencode-quota/quota-toast.json"];
export declare const QUOTA_TOAST_CONFIG_RELATIVE_PATH: "opencode-quota/quota-toast.json";
export declare const QUOTA_TOAST_SETTING_SOURCE_KEYS: readonly ["enabled", "enableToast", "resetNotifications.enabled", "resetNotifications.windows", "tuiCommandDisplay", "formatStyle", "percentDisplayMode", "resetTimeDecimals", "minIntervalMs", "requestTimeoutMs", "debug", "enabledProviders", "quotaProviders", "anthropicBinaryPath", "googleModels", "cursorPlan", "cursorIncludedApiUsd", "cursorBillingCycleStartDay", "opencodeGoWindows", "opencodeMonthlyLimit", "pricingSnapshot.source", "pricingSnapshot.autoRefresh", "showOnIdle", "showOnQuestion", "showOnCompact", "showOnBothFail", "toastDurationMs", "onlyCurrentModel", "showSessionTokens", "sessionTokenScope", "tuiSidebarPanel.enabled", "tuiSidebarPanel.formatStyle", "tuiCompactStatus.enabled", "tuiCompactStatus.homeBottom", "tuiCompactStatus.sessionPrompt", "tuiCompactStatus.suppressWhenNativeProviderQuota", "tuiCompactStatus.maxWidth", "tuiCompactStatus.formatStyle", "tuiPromptBar.enabled", "maintainerAnnouncements.enabled", "maintainerAnnouncements.home", "layout.maxWidth", "layout.narrowAt", "layout.tinyAt", "export.enabled", "export.path", "telemetry.enabled"];
export type QuotaToastSettingSourceKey = (typeof QUOTA_TOAST_SETTING_SOURCE_KEYS)[number];
export type QuotaToastSettingSources = Partial<Record<QuotaToastSettingSourceKey, string>>;
export interface LoadConfigIssue {
    path: string;
    key: string;
    message: string;
}
export interface LoadConfigMeta {
    source: "sdk" | "files" | "defaults";
    paths: string[];
    globalConfigPaths: string[];
    workspaceConfigPaths: string[];
    settingSources: QuotaToastSettingSources;
    networkSettingSources: Record<string, string>;
    configIssues: LoadConfigIssue[];
}
export interface LoadConfigOptions {
    /** @deprecated Prefer configRootDir for new callers. */
    cwd?: string;
    configRootDir?: string;
}
export declare function createLoadConfigMeta(): LoadConfigMeta;
export declare function getQuotaToastConfigPath(configRootDir: string, format?: "json" | "jsonc"): string;
export declare function resolveQuotaToastConfigPath(configRootDir: string): string;
/**
 * Load plugin configuration from OpenCode config
 *
 * @param client - Optional OpenCode SDK client fallback
 * @returns Merged configuration with defaults
 */
export declare function loadConfig(client: {
    config: {
        get: () => Promise<{
            data?: {
                experimental?: {
                    quotaToast?: Partial<QuotaToastConfig>;
                };
            };
        }>;
    };
} | undefined, meta?: LoadConfigMeta, options?: LoadConfigOptions): Promise<QuotaToastConfig>;
//# sourceMappingURL=config.d.ts.map