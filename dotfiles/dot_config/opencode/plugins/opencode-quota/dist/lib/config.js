/**
 * Configuration loader for opencode-quota plugin.
 *
 * Precedence model:
 * - Global/user config provides defaults.
 * - Workspace config at the resolved config root overrides ordinary settings.
 * - SDK config is used only as a fallback when no file-backed config exists.
 */
import { existsSync } from "fs";
import { join } from "path";
import { getEffectiveConfigRoot } from "./config-file-utils.js";
import { isResetTimeDecimals } from "./format-utils.js";
import { buildOpenCodeConfigCandidates, readOpenCodeConfigCandidate, } from "./opencode-config-read.js";
import { getOpencodeRuntimeDirCandidates } from "./opencode-runtime-paths.js";
import { getQuotaProviderShape, normalizeQuotaProviderId } from "./provider-metadata.js";
import { isQuotaFormatStyle, resolveQuotaFormatStyle } from "./quota-format-style.js";
import { cloneQuotaProviders, validateQuotaProviders } from "./quota-providers.js";
import { DEFAULT_CONFIG } from "./types.js";
export const QUOTA_TOAST_CONFIG_RELATIVE_PATHS = [
    "opencode-quota/quota-toast.jsonc",
    "opencode-quota/quota-toast.json",
];
export const QUOTA_TOAST_CONFIG_RELATIVE_PATH = QUOTA_TOAST_CONFIG_RELATIVE_PATHS[1];
export const QUOTA_TOAST_SETTING_SOURCE_KEYS = [
    "enabled",
    "enableToast",
    "resetNotifications.enabled",
    "resetNotifications.windows",
    "tuiCommandDisplay",
    "formatStyle",
    "percentDisplayMode",
    "resetTimeDecimals",
    "minIntervalMs",
    "requestTimeoutMs",
    "debug",
    "enabledProviders",
    "quotaProviders",
    "anthropicBinaryPath",
    "googleModels",
    "cursorPlan",
    "cursorIncludedApiUsd",
    "cursorBillingCycleStartDay",
    "opencodeGoWindows",
    "opencodeMonthlyLimit",
    "pricingSnapshot.source",
    "pricingSnapshot.autoRefresh",
    "showOnIdle",
    "showOnQuestion",
    "showOnCompact",
    "showOnBothFail",
    "toastDurationMs",
    "onlyCurrentModel",
    "showSessionTokens",
    "sessionTokenScope",
    "tuiSidebarPanel.enabled",
    "tuiSidebarPanel.formatStyle",
    "tuiCompactStatus.enabled",
    "tuiCompactStatus.homeBottom",
    "tuiCompactStatus.sessionPrompt",
    "tuiCompactStatus.suppressWhenNativeProviderQuota",
    "tuiCompactStatus.maxWidth",
    "tuiCompactStatus.formatStyle",
    "tuiPromptBar.enabled",
    "maintainerAnnouncements.enabled",
    "maintainerAnnouncements.home",
    "layout.maxWidth",
    "layout.narrowAt",
    "layout.tinyAt",
    "export.enabled",
    "export.path",
    "telemetry.enabled",
];
export function createLoadConfigMeta() {
    return {
        source: "defaults",
        paths: [],
        globalConfigPaths: [],
        workspaceConfigPaths: [],
        settingSources: {},
        networkSettingSources: {},
        configIssues: [],
    };
}
const NETWORK_SETTING_SOURCE_KEYS = [
    "enabled",
    "enabledProviders",
    "quotaProviders",
    "minIntervalMs",
    "requestTimeoutMs",
    "pricingSnapshot.source",
    "pricingSnapshot.autoRefresh",
    "showOnIdle",
    "showOnQuestion",
    "showOnCompact",
    "showOnBothFail",
];
export function getQuotaToastConfigPath(configRootDir, format = "json") {
    return join(configRootDir, `opencode-quota/quota-toast.${format}`);
}
export function resolveQuotaToastConfigPath(configRootDir) {
    return (QUOTA_TOAST_CONFIG_RELATIVE_PATHS.map((relativePath) => join(configRootDir, relativePath)).find((path) => existsSync(path)) ?? getQuotaToastConfigPath(configRootDir));
}
function hasOwnKey(value, key) {
    return Object.hasOwn(value, key);
}
function isPlainObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
/**
 * Validates and normalizes a Google model ID
 */
function isValidGoogleModelId(id) {
    return typeof id === "string" && ["G3PRO", "G3FLASH", "CLAUDE", "G3IMAGE", "GPTOSS"].includes(id);
}
function isValidCursorQuotaPlan(plan) {
    return typeof plan === "string" && ["none", "pro", "pro-plus", "ultra"].includes(plan);
}
function isValidPricingSnapshotSource(source) {
    return typeof source === "string" && ["auto", "bundled", "runtime"].includes(source);
}
function isValidPricingSnapshotAutoRefresh(value) {
    return typeof value === "number" && Number.isInteger(value) && value > 0;
}
function isValidPercentDisplayMode(value) {
    return value === "remaining" || value === "used";
}
function isValidTuiCommandDisplay(value) {
    return value === "inline" || value === "dialog";
}
function isValidSessionTokenScope(value) {
    return value === "current" || value === "tree";
}
function isPositiveNumber(value) {
    return typeof value === "number" && Number.isFinite(value) && value > 0;
}
function isValidCursorBillingCycleStartDay(value) {
    return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 28;
}
const VALID_OPENCODE_GO_WINDOWS = ["rolling", "weekly", "monthly"];
function isValidOpenCodeGoWindows(value) {
    if (!Array.isArray(value))
        return false;
    if (value.length === 0)
        return false;
    return value.every((v) => typeof v === "string" &&
        VALID_OPENCODE_GO_WINDOWS.includes(v));
}
function normalizeOptionalString(value) {
    if (typeof value !== "string") {
        return undefined;
    }
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
}
function getExplicitFormatStyle(config) {
    if (!config || !isQuotaFormatStyle(config.formatStyle)) {
        return undefined;
    }
    return resolveQuotaFormatStyle(config.formatStyle);
}
function getConfiguredFormatStyle(quotaToastConfig) {
    const formatStyle = getExplicitFormatStyle(quotaToastConfig);
    if (formatStyle) {
        return formatStyle;
    }
    const legacyFormatStyle = quotaToastConfig
        ?.toastStyle;
    if (isQuotaFormatStyle(legacyFormatStyle)) {
        return resolveQuotaFormatStyle(legacyFormatStyle);
    }
    return undefined;
}
/**
 * Remove duplicates from an array while preserving order
 */
function dedupe(list) {
    return [...new Set(list)];
}
function cloneDefaultConfig() {
    return cloneConfig(DEFAULT_CONFIG);
}
function cloneConfig(config) {
    return {
        ...config,
        enabledProviders: Array.isArray(config.enabledProviders)
            ? [...config.enabledProviders]
            : config.enabledProviders,
        quotaProviders: cloneQuotaProviders(config.quotaProviders),
        resetNotifications: {
            ...config.resetNotifications,
            windows: [...config.resetNotifications.windows],
        },
        googleModels: [...config.googleModels],
        opencodeGoWindows: [...config.opencodeGoWindows],
        opencodeMonthlyLimit: config.opencodeMonthlyLimit,
        pricingSnapshot: { ...config.pricingSnapshot },
        tuiSidebarPanel: { ...config.tuiSidebarPanel },
        tuiCompactStatus: { ...config.tuiCompactStatus },
        tuiPromptBar: { ...config.tuiPromptBar },
        maintainerAnnouncements: { ...config.maintainerAnnouncements },
        layout: { ...config.layout },
        export: { ...config.export },
        telemetry: { ...config.telemetry },
    };
}
const QUOTA_RESET_WINDOWS = [
    "fiveHour",
    "hourly",
    "daily",
    "weekly",
    "monthly",
    "yearly",
];
function extractQuotaResetNotificationsPatch(value, reportIssue) {
    if (!isPlainObject(value))
        return undefined;
    const patch = {};
    if (hasOwnKey(value, "enabled")) {
        if (typeof value.enabled === "boolean")
            patch.enabled = value.enabled;
        else
            reportIssue?.("resetNotifications.enabled", "expected boolean");
    }
    if (hasOwnKey(value, "windows")) {
        if (Array.isArray(value.windows) &&
            value.windows.length > 0 &&
            value.windows.every((window) => QUOTA_RESET_WINDOWS.includes(window))) {
            patch.windows = dedupe(value.windows);
        }
        else {
            reportIssue?.("resetNotifications.windows", `expected a non-empty array of: ${QUOTA_RESET_WINDOWS.join(", ")}`);
        }
    }
    return Object.keys(patch).length > 0 ? patch : undefined;
}
function describeInvalidProviderValue(value) {
    return typeof value === "string" ? value : typeof value;
}
function normalizeEnabledProviders(value) {
    if (value === "auto") {
        return { value: "auto", issues: [] };
    }
    if (!Array.isArray(value)) {
        return {
            value: [],
            issues: ['expected "auto" or an array of provider ids'],
            invalidEmpty: true,
        };
    }
    if (value.length === 0) {
        return { value: [], issues: [] };
    }
    const validProviders = [];
    const invalidProviders = [];
    for (const provider of value) {
        if (typeof provider !== "string") {
            invalidProviders.push(describeInvalidProviderValue(provider));
            continue;
        }
        const normalized = normalizeQuotaProviderId(provider);
        if (normalized && getQuotaProviderShape(normalized)) {
            validProviders.push(normalized);
        }
        else {
            invalidProviders.push(provider);
        }
    }
    const issues = invalidProviders.length
        ? [`unknown provider id(s): ${dedupe(invalidProviders).join(", ")}`]
        : [];
    const normalizedProviders = dedupe(validProviders);
    return {
        value: normalizedProviders,
        issues,
        invalidEmpty: normalizedProviders.length === 0 && invalidProviders.length > 0,
    };
}
function normalizeGoogleModels(value) {
    if (!Array.isArray(value)) {
        return undefined;
    }
    const models = value.filter(isValidGoogleModelId);
    return models.length > 0 ? models : undefined;
}
function extractPricingSnapshotPatch(value) {
    if (!isPlainObject(value)) {
        return undefined;
    }
    const patch = {};
    if (hasOwnKey(value, "source") && isValidPricingSnapshotSource(value.source)) {
        patch.source = value.source;
    }
    if (hasOwnKey(value, "autoRefresh") && isValidPricingSnapshotAutoRefresh(value.autoRefresh)) {
        patch.autoRefresh = value.autoRefresh;
    }
    return Object.keys(patch).length > 0 ? patch : undefined;
}
function extractTuiSidebarPanelPatch(value) {
    if (!isPlainObject(value)) {
        return undefined;
    }
    const patch = {};
    if (hasOwnKey(value, "enabled") && typeof value.enabled === "boolean") {
        patch.enabled = value.enabled;
    }
    const sidebarFormatStyle = getExplicitFormatStyle(value);
    if (sidebarFormatStyle) {
        patch.formatStyle = sidebarFormatStyle;
    }
    return Object.keys(patch).length > 0 ? patch : undefined;
}
function extractTuiCompactStatusPatch(value) {
    if (!isPlainObject(value)) {
        return undefined;
    }
    const patch = {};
    if (hasOwnKey(value, "enabled") && typeof value.enabled === "boolean") {
        patch.enabled = value.enabled;
    }
    if (hasOwnKey(value, "homeBottom") && typeof value.homeBottom === "boolean") {
        patch.homeBottom = value.homeBottom;
    }
    if (hasOwnKey(value, "sessionPrompt") && typeof value.sessionPrompt === "boolean") {
        patch.sessionPrompt = value.sessionPrompt;
    }
    if (hasOwnKey(value, "suppressWhenNativeProviderQuota") &&
        typeof value.suppressWhenNativeProviderQuota === "boolean") {
        patch.suppressWhenNativeProviderQuota = value.suppressWhenNativeProviderQuota;
    }
    if (hasOwnKey(value, "maxWidth") && isPositiveNumber(value.maxWidth)) {
        patch.maxWidth = value.maxWidth;
    }
    const compactFormatStyle = getExplicitFormatStyle(value);
    if (compactFormatStyle) {
        patch.formatStyle = compactFormatStyle;
    }
    return Object.keys(patch).length > 0 ? patch : undefined;
}
function extractTuiPromptBarPatch(value) {
    if (!isPlainObject(value)) {
        return undefined;
    }
    const patch = {};
    if (hasOwnKey(value, "enabled") && typeof value.enabled === "boolean") {
        patch.enabled = value.enabled;
    }
    return Object.keys(patch).length > 0 ? patch : undefined;
}
function extractMaintainerAnnouncementsPatch(value) {
    if (!isPlainObject(value)) {
        return undefined;
    }
    const patch = {};
    if (hasOwnKey(value, "enabled") && typeof value.enabled === "boolean") {
        patch.enabled = value.enabled;
    }
    if (hasOwnKey(value, "home") && typeof value.home === "boolean") {
        patch.home = value.home;
    }
    return Object.keys(patch).length > 0 ? patch : undefined;
}
function extractLayoutPatch(value) {
    if (!isPlainObject(value)) {
        return undefined;
    }
    const patch = {};
    if (hasOwnKey(value, "maxWidth") && isPositiveNumber(value.maxWidth)) {
        patch.maxWidth = value.maxWidth;
    }
    if (hasOwnKey(value, "narrowAt") && isPositiveNumber(value.narrowAt)) {
        patch.narrowAt = value.narrowAt;
    }
    if (hasOwnKey(value, "tinyAt") && isPositiveNumber(value.tinyAt)) {
        patch.tinyAt = value.tinyAt;
    }
    return Object.keys(patch).length > 0 ? patch : undefined;
}
function extractExportConfigPatch(value) {
    if (!isPlainObject(value)) {
        return undefined;
    }
    const patch = {};
    if (hasOwnKey(value, "enabled") && typeof value.enabled === "boolean") {
        patch.enabled = value.enabled;
    }
    if (hasOwnKey(value, "path") && typeof value.path === "string") {
        patch.path = value.path;
    }
    return Object.keys(patch).length > 0 ? patch : undefined;
}
function extractTelemetryConfigPatch(value) {
    if (!isPlainObject(value)) {
        return undefined;
    }
    const patch = {};
    if (hasOwnKey(value, "enabled") && typeof value.enabled === "boolean") {
        patch.enabled = value.enabled;
    }
    return Object.keys(patch).length > 0 ? patch : undefined;
}
function extractValidatedQuotaToastPatch(quotaToastConfig, reportIssue) {
    const patch = {};
    if (hasOwnKey(quotaToastConfig, "enabled") && typeof quotaToastConfig.enabled === "boolean") {
        patch.enabled = quotaToastConfig.enabled;
    }
    if (hasOwnKey(quotaToastConfig, "enableToast") &&
        typeof quotaToastConfig.enableToast === "boolean") {
        patch.enableToast = quotaToastConfig.enableToast;
    }
    if (hasOwnKey(quotaToastConfig, "resetNotifications")) {
        const resetNotifications = extractQuotaResetNotificationsPatch(quotaToastConfig.resetNotifications, reportIssue);
        if (resetNotifications)
            patch.resetNotifications = resetNotifications;
    }
    if (hasOwnKey(quotaToastConfig, "tuiCommandDisplay")) {
        if (isValidTuiCommandDisplay(quotaToastConfig.tuiCommandDisplay)) {
            patch.tuiCommandDisplay = quotaToastConfig.tuiCommandDisplay;
        }
        else {
            reportIssue?.("tuiCommandDisplay", 'expected "inline" or "dialog"');
        }
    }
    const formatStyle = getConfiguredFormatStyle(quotaToastConfig);
    if (formatStyle) {
        patch.formatStyle = formatStyle;
    }
    if (hasOwnKey(quotaToastConfig, "percentDisplayMode") &&
        isValidPercentDisplayMode(quotaToastConfig.percentDisplayMode)) {
        patch.percentDisplayMode = quotaToastConfig.percentDisplayMode;
    }
    if (hasOwnKey(quotaToastConfig, "resetTimeDecimals") &&
        isResetTimeDecimals(quotaToastConfig.resetTimeDecimals)) {
        patch.resetTimeDecimals = quotaToastConfig.resetTimeDecimals;
    }
    if (hasOwnKey(quotaToastConfig, "minIntervalMs") &&
        isPositiveNumber(quotaToastConfig.minIntervalMs)) {
        patch.minIntervalMs = quotaToastConfig.minIntervalMs;
    }
    if (hasOwnKey(quotaToastConfig, "requestTimeoutMs") &&
        isPositiveNumber(quotaToastConfig.requestTimeoutMs)) {
        patch.requestTimeoutMs = quotaToastConfig.requestTimeoutMs;
    }
    if (hasOwnKey(quotaToastConfig, "debug") && typeof quotaToastConfig.debug === "boolean") {
        patch.debug = quotaToastConfig.debug;
    }
    if (hasOwnKey(quotaToastConfig, "enabledProviders")) {
        const enabledProviders = normalizeEnabledProviders(quotaToastConfig.enabledProviders);
        for (const issue of enabledProviders.issues) {
            reportIssue?.("enabledProviders", issue);
        }
        if (enabledProviders.value !== undefined) {
            patch.enabledProviders = enabledProviders.value;
            if (enabledProviders.invalidEmpty) {
                patch.enabledProvidersInvalidEmpty = true;
            }
        }
    }
    if (hasOwnKey(quotaToastConfig, "anthropicBinaryPath")) {
        const anthropicBinaryPath = normalizeOptionalString(quotaToastConfig.anthropicBinaryPath);
        if (anthropicBinaryPath !== undefined) {
            patch.anthropicBinaryPath = anthropicBinaryPath;
        }
    }
    if (hasOwnKey(quotaToastConfig, "googleModels")) {
        const googleModels = normalizeGoogleModels(quotaToastConfig.googleModels);
        if (googleModels !== undefined) {
            patch.googleModels = googleModels;
        }
    }
    if (hasOwnKey(quotaToastConfig, "cursorPlan") &&
        isValidCursorQuotaPlan(quotaToastConfig.cursorPlan)) {
        patch.cursorPlan = quotaToastConfig.cursorPlan;
    }
    if (hasOwnKey(quotaToastConfig, "cursorIncludedApiUsd") &&
        isPositiveNumber(quotaToastConfig.cursorIncludedApiUsd)) {
        patch.cursorIncludedApiUsd = quotaToastConfig.cursorIncludedApiUsd;
    }
    if (hasOwnKey(quotaToastConfig, "cursorBillingCycleStartDay") &&
        isValidCursorBillingCycleStartDay(quotaToastConfig.cursorBillingCycleStartDay)) {
        patch.cursorBillingCycleStartDay = quotaToastConfig.cursorBillingCycleStartDay;
    }
    if (hasOwnKey(quotaToastConfig, "opencodeGoWindows") &&
        isValidOpenCodeGoWindows(quotaToastConfig.opencodeGoWindows)) {
        patch.opencodeGoWindows = quotaToastConfig.opencodeGoWindows;
    }
    if (hasOwnKey(quotaToastConfig, "opencodeMonthlyLimit") &&
        isPositiveNumber(quotaToastConfig.opencodeMonthlyLimit)) {
        patch.opencodeMonthlyLimit = quotaToastConfig.opencodeMonthlyLimit;
    }
    if (hasOwnKey(quotaToastConfig, "pricingSnapshot")) {
        const pricingSnapshot = extractPricingSnapshotPatch(quotaToastConfig.pricingSnapshot);
        if (pricingSnapshot) {
            patch.pricingSnapshot = pricingSnapshot;
        }
    }
    if (hasOwnKey(quotaToastConfig, "showOnIdle") &&
        typeof quotaToastConfig.showOnIdle === "boolean") {
        patch.showOnIdle = quotaToastConfig.showOnIdle;
    }
    if (hasOwnKey(quotaToastConfig, "showOnQuestion") &&
        typeof quotaToastConfig.showOnQuestion === "boolean") {
        patch.showOnQuestion = quotaToastConfig.showOnQuestion;
    }
    if (hasOwnKey(quotaToastConfig, "showOnCompact") &&
        typeof quotaToastConfig.showOnCompact === "boolean") {
        patch.showOnCompact = quotaToastConfig.showOnCompact;
    }
    if (hasOwnKey(quotaToastConfig, "showOnBothFail") &&
        typeof quotaToastConfig.showOnBothFail === "boolean") {
        patch.showOnBothFail = quotaToastConfig.showOnBothFail;
    }
    if (hasOwnKey(quotaToastConfig, "toastDurationMs") &&
        isPositiveNumber(quotaToastConfig.toastDurationMs)) {
        patch.toastDurationMs = quotaToastConfig.toastDurationMs;
    }
    if (hasOwnKey(quotaToastConfig, "onlyCurrentModel") &&
        typeof quotaToastConfig.onlyCurrentModel === "boolean") {
        patch.onlyCurrentModel = quotaToastConfig.onlyCurrentModel;
    }
    if (hasOwnKey(quotaToastConfig, "showSessionTokens") &&
        typeof quotaToastConfig.showSessionTokens === "boolean") {
        patch.showSessionTokens = quotaToastConfig.showSessionTokens;
    }
    if (hasOwnKey(quotaToastConfig, "sessionTokenScope")) {
        if (isValidSessionTokenScope(quotaToastConfig.sessionTokenScope)) {
            patch.sessionTokenScope = quotaToastConfig.sessionTokenScope;
        }
        else {
            reportIssue?.("sessionTokenScope", 'expected "current" or "tree"');
        }
    }
    if (hasOwnKey(quotaToastConfig, "tuiSidebarPanel")) {
        const tuiSidebarPanel = extractTuiSidebarPanelPatch(quotaToastConfig.tuiSidebarPanel);
        if (tuiSidebarPanel) {
            patch.tuiSidebarPanel = tuiSidebarPanel;
        }
    }
    if (hasOwnKey(quotaToastConfig, "tuiCompactStatus")) {
        const tuiCompactStatus = extractTuiCompactStatusPatch(quotaToastConfig.tuiCompactStatus);
        if (tuiCompactStatus) {
            patch.tuiCompactStatus = tuiCompactStatus;
        }
    }
    if (hasOwnKey(quotaToastConfig, "tuiPromptBar")) {
        const tuiPromptBar = extractTuiPromptBarPatch(quotaToastConfig.tuiPromptBar);
        if (tuiPromptBar) {
            patch.tuiPromptBar = tuiPromptBar;
        }
    }
    if (hasOwnKey(quotaToastConfig, "maintainerAnnouncements")) {
        const maintainerAnnouncements = extractMaintainerAnnouncementsPatch(quotaToastConfig.maintainerAnnouncements);
        if (maintainerAnnouncements) {
            patch.maintainerAnnouncements = maintainerAnnouncements;
        }
    }
    if (hasOwnKey(quotaToastConfig, "layout")) {
        const layout = extractLayoutPatch(quotaToastConfig.layout);
        if (layout) {
            patch.layout = layout;
        }
    }
    if (hasOwnKey(quotaToastConfig, "export")) {
        const exportConfig = extractExportConfigPatch(quotaToastConfig.export);
        if (exportConfig) {
            patch.export = exportConfig;
        }
    }
    if (hasOwnKey(quotaToastConfig, "telemetry")) {
        const telemetry = extractTelemetryConfigPatch(quotaToastConfig.telemetry);
        if (telemetry) {
            patch.telemetry = telemetry;
        }
    }
    return patch;
}
function applySettingSource(settingSources, key, sourcePath) {
    settingSources[key] = sourcePath;
}
function applyValidatedQuotaToastPatch(config, patch, sourcePath, settingSources) {
    if (hasOwnKey(patch, "enabled")) {
        config.enabled = patch.enabled;
        applySettingSource(settingSources, "enabled", sourcePath);
    }
    if (hasOwnKey(patch, "enableToast")) {
        config.enableToast = patch.enableToast;
        applySettingSource(settingSources, "enableToast", sourcePath);
    }
    if (patch.resetNotifications) {
        if (hasOwnKey(patch.resetNotifications, "enabled")) {
            config.resetNotifications.enabled = patch.resetNotifications.enabled;
            applySettingSource(settingSources, "resetNotifications.enabled", sourcePath);
        }
        if (hasOwnKey(patch.resetNotifications, "windows")) {
            config.resetNotifications.windows = [...patch.resetNotifications.windows];
            applySettingSource(settingSources, "resetNotifications.windows", sourcePath);
        }
    }
    if (hasOwnKey(patch, "tuiCommandDisplay")) {
        config.tuiCommandDisplay = patch.tuiCommandDisplay;
        applySettingSource(settingSources, "tuiCommandDisplay", sourcePath);
    }
    if (hasOwnKey(patch, "formatStyle")) {
        config.formatStyle = patch.formatStyle;
        applySettingSource(settingSources, "formatStyle", sourcePath);
    }
    if (hasOwnKey(patch, "percentDisplayMode")) {
        config.percentDisplayMode = patch.percentDisplayMode;
        applySettingSource(settingSources, "percentDisplayMode", sourcePath);
    }
    if (hasOwnKey(patch, "resetTimeDecimals")) {
        config.resetTimeDecimals = patch.resetTimeDecimals;
        applySettingSource(settingSources, "resetTimeDecimals", sourcePath);
    }
    if (hasOwnKey(patch, "minIntervalMs")) {
        config.minIntervalMs = patch.minIntervalMs;
        applySettingSource(settingSources, "minIntervalMs", sourcePath);
    }
    if (hasOwnKey(patch, "requestTimeoutMs")) {
        config.requestTimeoutMs = patch.requestTimeoutMs;
        applySettingSource(settingSources, "requestTimeoutMs", sourcePath);
    }
    if (hasOwnKey(patch, "debug")) {
        config.debug = patch.debug;
        applySettingSource(settingSources, "debug", sourcePath);
    }
    if (hasOwnKey(patch, "enabledProviders")) {
        if (!(patch.enabledProvidersInvalidEmpty && settingSources.enabledProviders)) {
            config.enabledProviders =
                patch.enabledProviders === "auto" ? "auto" : [...patch.enabledProviders];
            applySettingSource(settingSources, "enabledProviders", sourcePath);
        }
    }
    if (hasOwnKey(patch, "anthropicBinaryPath")) {
        config.anthropicBinaryPath = patch.anthropicBinaryPath;
        applySettingSource(settingSources, "anthropicBinaryPath", sourcePath);
    }
    if (hasOwnKey(patch, "googleModels")) {
        config.googleModels = [...patch.googleModels];
        applySettingSource(settingSources, "googleModels", sourcePath);
    }
    if (hasOwnKey(patch, "cursorPlan")) {
        config.cursorPlan = patch.cursorPlan;
        applySettingSource(settingSources, "cursorPlan", sourcePath);
    }
    if (hasOwnKey(patch, "cursorIncludedApiUsd")) {
        config.cursorIncludedApiUsd = patch.cursorIncludedApiUsd;
        applySettingSource(settingSources, "cursorIncludedApiUsd", sourcePath);
    }
    if (hasOwnKey(patch, "cursorBillingCycleStartDay")) {
        config.cursorBillingCycleStartDay = patch.cursorBillingCycleStartDay;
        applySettingSource(settingSources, "cursorBillingCycleStartDay", sourcePath);
    }
    if (hasOwnKey(patch, "opencodeGoWindows")) {
        config.opencodeGoWindows = [...patch.opencodeGoWindows];
        applySettingSource(settingSources, "opencodeGoWindows", sourcePath);
    }
    if (hasOwnKey(patch, "opencodeMonthlyLimit")) {
        config.opencodeMonthlyLimit = patch.opencodeMonthlyLimit;
        applySettingSource(settingSources, "opencodeMonthlyLimit", sourcePath);
    }
    if (patch.pricingSnapshot) {
        if (hasOwnKey(patch.pricingSnapshot, "source")) {
            config.pricingSnapshot.source = patch.pricingSnapshot.source;
            applySettingSource(settingSources, "pricingSnapshot.source", sourcePath);
        }
        if (hasOwnKey(patch.pricingSnapshot, "autoRefresh")) {
            config.pricingSnapshot.autoRefresh = patch.pricingSnapshot.autoRefresh;
            applySettingSource(settingSources, "pricingSnapshot.autoRefresh", sourcePath);
        }
    }
    if (hasOwnKey(patch, "showOnIdle")) {
        config.showOnIdle = patch.showOnIdle;
        applySettingSource(settingSources, "showOnIdle", sourcePath);
    }
    if (hasOwnKey(patch, "showOnQuestion")) {
        config.showOnQuestion = patch.showOnQuestion;
        applySettingSource(settingSources, "showOnQuestion", sourcePath);
    }
    if (hasOwnKey(patch, "showOnCompact")) {
        config.showOnCompact = patch.showOnCompact;
        applySettingSource(settingSources, "showOnCompact", sourcePath);
    }
    if (hasOwnKey(patch, "showOnBothFail")) {
        config.showOnBothFail = patch.showOnBothFail;
        applySettingSource(settingSources, "showOnBothFail", sourcePath);
    }
    if (hasOwnKey(patch, "toastDurationMs")) {
        config.toastDurationMs = patch.toastDurationMs;
        applySettingSource(settingSources, "toastDurationMs", sourcePath);
    }
    if (hasOwnKey(patch, "onlyCurrentModel")) {
        config.onlyCurrentModel = patch.onlyCurrentModel;
        applySettingSource(settingSources, "onlyCurrentModel", sourcePath);
    }
    if (hasOwnKey(patch, "showSessionTokens")) {
        config.showSessionTokens = patch.showSessionTokens;
        applySettingSource(settingSources, "showSessionTokens", sourcePath);
    }
    if (hasOwnKey(patch, "sessionTokenScope")) {
        config.sessionTokenScope = patch.sessionTokenScope;
        applySettingSource(settingSources, "sessionTokenScope", sourcePath);
    }
    if (patch.tuiSidebarPanel) {
        if (hasOwnKey(patch.tuiSidebarPanel, "enabled")) {
            config.tuiSidebarPanel.enabled = patch.tuiSidebarPanel.enabled;
            applySettingSource(settingSources, "tuiSidebarPanel.enabled", sourcePath);
        }
        if (hasOwnKey(patch.tuiSidebarPanel, "formatStyle")) {
            config.tuiSidebarPanel.formatStyle = patch.tuiSidebarPanel.formatStyle;
            applySettingSource(settingSources, "tuiSidebarPanel.formatStyle", sourcePath);
        }
    }
    if (patch.tuiCompactStatus) {
        if (hasOwnKey(patch.tuiCompactStatus, "enabled")) {
            config.tuiCompactStatus.enabled = patch.tuiCompactStatus.enabled;
            applySettingSource(settingSources, "tuiCompactStatus.enabled", sourcePath);
        }
        if (hasOwnKey(patch.tuiCompactStatus, "homeBottom")) {
            config.tuiCompactStatus.homeBottom = patch.tuiCompactStatus.homeBottom;
            applySettingSource(settingSources, "tuiCompactStatus.homeBottom", sourcePath);
        }
        if (hasOwnKey(patch.tuiCompactStatus, "sessionPrompt")) {
            config.tuiCompactStatus.sessionPrompt = patch.tuiCompactStatus.sessionPrompt;
            applySettingSource(settingSources, "tuiCompactStatus.sessionPrompt", sourcePath);
        }
        if (hasOwnKey(patch.tuiCompactStatus, "suppressWhenNativeProviderQuota")) {
            config.tuiCompactStatus.suppressWhenNativeProviderQuota =
                patch.tuiCompactStatus.suppressWhenNativeProviderQuota;
            applySettingSource(settingSources, "tuiCompactStatus.suppressWhenNativeProviderQuota", sourcePath);
        }
        if (hasOwnKey(patch.tuiCompactStatus, "maxWidth")) {
            config.tuiCompactStatus.maxWidth = patch.tuiCompactStatus.maxWidth;
            applySettingSource(settingSources, "tuiCompactStatus.maxWidth", sourcePath);
        }
        if (hasOwnKey(patch.tuiCompactStatus, "formatStyle")) {
            config.tuiCompactStatus.formatStyle = patch.tuiCompactStatus.formatStyle;
            applySettingSource(settingSources, "tuiCompactStatus.formatStyle", sourcePath);
        }
    }
    if (patch.tuiPromptBar) {
        if (hasOwnKey(patch.tuiPromptBar, "enabled")) {
            config.tuiPromptBar.enabled = patch.tuiPromptBar.enabled;
            applySettingSource(settingSources, "tuiPromptBar.enabled", sourcePath);
        }
    }
    if (patch.maintainerAnnouncements) {
        if (hasOwnKey(patch.maintainerAnnouncements, "enabled")) {
            config.maintainerAnnouncements.enabled = patch.maintainerAnnouncements.enabled;
            applySettingSource(settingSources, "maintainerAnnouncements.enabled", sourcePath);
        }
        if (hasOwnKey(patch.maintainerAnnouncements, "home")) {
            config.maintainerAnnouncements.home = patch.maintainerAnnouncements.home;
            applySettingSource(settingSources, "maintainerAnnouncements.home", sourcePath);
        }
    }
    if (patch.layout) {
        if (hasOwnKey(patch.layout, "maxWidth")) {
            config.layout.maxWidth = patch.layout.maxWidth;
            applySettingSource(settingSources, "layout.maxWidth", sourcePath);
        }
        if (hasOwnKey(patch.layout, "narrowAt")) {
            config.layout.narrowAt = patch.layout.narrowAt;
            applySettingSource(settingSources, "layout.narrowAt", sourcePath);
        }
        if (hasOwnKey(patch.layout, "tinyAt")) {
            config.layout.tinyAt = patch.layout.tinyAt;
            applySettingSource(settingSources, "layout.tinyAt", sourcePath);
        }
    }
    if (patch.export) {
        if (hasOwnKey(patch.export, "enabled")) {
            config.export.enabled = patch.export.enabled;
            applySettingSource(settingSources, "export.enabled", sourcePath);
        }
        if (hasOwnKey(patch.export, "path")) {
            config.export.path = patch.export.path;
            applySettingSource(settingSources, "export.path", sourcePath);
        }
    }
    if (patch.telemetry && hasOwnKey(patch.telemetry, "enabled")) {
        config.telemetry.enabled = patch.telemetry.enabled;
        applySettingSource(settingSources, "telemetry.enabled", sourcePath);
    }
}
function projectNetworkSettingSources(settingSources) {
    const projected = {};
    for (const key of NETWORK_SETTING_SOURCE_KEYS) {
        const source = settingSources[key];
        if (typeof source === "string" && source.length > 0) {
            projected[key] = source;
        }
    }
    return projected;
}
function buildConfigLayerCandidatesForRoot(dir, scope) {
    return [
        ...QUOTA_TOAST_CONFIG_RELATIVE_PATHS.map((relativePath) => ({
            path: join(dir, relativePath),
            rootDir: dir,
            scope,
            kind: "plugin",
        })),
        ...buildOpenCodeConfigCandidates({
            directories: [dir],
            formatOrder: ["json", "jsonc"],
        }).map((candidate) => ({
            path: candidate.path,
            rootDir: dir,
            scope,
            kind: "legacy",
        })),
    ];
}
function buildConfigLayerCandidates(configDirs, configRootDir) {
    const workspaceCandidates = buildConfigLayerCandidatesForRoot(configRootDir, "workspace");
    const globalCandidates = configDirs.flatMap((dir) => buildConfigLayerCandidatesForRoot(dir, "global"));
    const globalPaths = new Set(globalCandidates.map((candidate) => candidate.path));
    return [
        ...globalCandidates,
        ...workspaceCandidates.filter((candidate) => !globalPaths.has(candidate.path)),
    ];
}
function getConfigLayerSourceLabel(candidate) {
    const suffix = candidate.kind === "plugin"
        ? candidate.path.endsWith(".jsonc")
            ? QUOTA_TOAST_CONFIG_RELATIVE_PATHS[0]
            : QUOTA_TOAST_CONFIG_RELATIVE_PATHS[1]
        : "experimental.quotaToast";
    return `${candidate.path} (${suffix})`;
}
/**
 * Load plugin configuration from OpenCode config
 *
 * @param client - Optional OpenCode SDK client fallback
 * @returns Merged configuration with defaults
 */
export async function loadConfig(client, meta, options) {
    async function readJson(path) {
        const result = await readOpenCodeConfigCandidate({
            path,
            format: path.endsWith(".jsonc") ? "jsonc" : "json",
        });
        return result.state === "parsed" ? result.value : null;
    }
    async function loadFromFiles() {
        const configRootDir = options?.configRootDir ?? getEffectiveConfigRoot(options?.cwd ?? process.cwd());
        const { configDirs } = getOpencodeRuntimeDirCandidates();
        const config = cloneDefaultConfig();
        const usedPaths = [];
        const globalConfigPaths = [];
        const workspaceConfigPaths = [];
        const settingSources = {};
        const configIssues = [];
        const authoritativeSidecarRoots = new Set();
        for (const candidate of buildConfigLayerCandidates(configDirs, configRootDir)) {
            const rootKey = `${candidate.scope}:${candidate.rootDir}`;
            if (candidate.kind === "legacy" && authoritativeSidecarRoots.has(rootKey)) {
                continue;
            }
            if (candidate.kind === "plugin" && authoritativeSidecarRoots.has(rootKey)) {
                continue;
            }
            if (!existsSync(candidate.path)) {
                continue;
            }
            const parsed = await readJson(candidate.path);
            if (!isPlainObject(parsed)) {
                if (candidate.kind === "plugin") {
                    const sourcePath = getConfigLayerSourceLabel(candidate);
                    usedPaths.push(sourcePath);
                    if (candidate.scope === "global") {
                        globalConfigPaths.push(sourcePath);
                    }
                    else {
                        workspaceConfigPaths.push(sourcePath);
                    }
                    configIssues.push({
                        path: sourcePath,
                        key: "$root",
                        message: "expected readable JSON object; this sidecar is not authoritative",
                    });
                }
                continue;
            }
            if (candidate.kind === "plugin") {
                authoritativeSidecarRoots.add(rootKey);
                if (candidate.path.endsWith(".jsonc") &&
                    existsSync(getQuotaToastConfigPath(candidate.rootDir, "json"))) {
                    configIssues.push({
                        path: getConfigLayerSourceLabel(candidate),
                        key: "$file",
                        message: "both quota-toast.jsonc and quota-toast.json exist; using quota-toast.jsonc",
                    });
                }
            }
            const extractedQuotaToast = candidate.kind === "plugin"
                ? parsed
                : isPlainObject(parsed.experimental)
                    ? parsed.experimental.quotaToast
                    : undefined;
            if (!isPlainObject(extractedQuotaToast)) {
                continue;
            }
            const sourcePath = getConfigLayerSourceLabel(candidate);
            usedPaths.push(sourcePath);
            if (candidate.scope === "global") {
                globalConfigPaths.push(sourcePath);
            }
            else {
                workspaceConfigPaths.push(sourcePath);
            }
            applyValidatedQuotaToastPatch(config, extractValidatedQuotaToastPatch(extractedQuotaToast, (key, message) => {
                configIssues.push({ path: sourcePath, key, message });
            }), sourcePath, settingSources);
            if (hasOwnKey(extractedQuotaToast, "alibabaCodingPlanTier")) {
                configIssues.push({
                    path: sourcePath,
                    key: "alibabaCodingPlanTier",
                    message: 'removed in v4; tune Alibaba through "quotaProviders"',
                });
            }
            if (hasOwnKey(extractedQuotaToast, "customSources")) {
                configIssues.push({
                    path: sourcePath,
                    key: "customSources",
                    message: 'removed in v4; use the global-only "quotaProviders" property',
                });
            }
            if (hasOwnKey(extractedQuotaToast, "quotaProviders")) {
                if (candidate.scope === "global") {
                    const validation = validateQuotaProviders(extractedQuotaToast.quotaProviders);
                    for (const issue of validation.issues) {
                        configIssues.push({ path: sourcePath, key: issue.key, message: issue.message });
                    }
                    if (validation.value) {
                        config.quotaProviders = cloneQuotaProviders(validation.value);
                        applySettingSource(settingSources, "quotaProviders", sourcePath);
                    }
                }
                else {
                    configIssues.push({
                        path: sourcePath,
                        key: "quotaProviders",
                        message: "allowed only in global OpenCode or global opencode-quota config",
                    });
                }
            }
        }
        if (usedPaths.length === 0) {
            return {
                config: null,
                usedPaths: [],
                globalConfigPaths: [],
                workspaceConfigPaths: [],
                settingSources: {},
                networkSettingSources: {},
                configIssues: [],
            };
        }
        return {
            config,
            usedPaths,
            globalConfigPaths,
            workspaceConfigPaths,
            settingSources,
            networkSettingSources: projectNetworkSettingSources(settingSources),
            configIssues,
        };
    }
    const fileConfig = await loadFromFiles();
    if (fileConfig.config) {
        if (meta) {
            meta.source = "files";
            meta.paths = fileConfig.usedPaths;
            meta.globalConfigPaths = fileConfig.globalConfigPaths;
            meta.workspaceConfigPaths = fileConfig.workspaceConfigPaths;
            meta.settingSources = fileConfig.settingSources;
            meta.networkSettingSources = fileConfig.networkSettingSources;
            meta.configIssues = fileConfig.configIssues;
        }
        return fileConfig.config;
    }
    if (client) {
        try {
            const response = await client.config.get();
            // OpenCode config schema is strict; plugin-specific config must live under
            // experimental.* to avoid "unrecognized key" validation errors.
            const quotaToastConfig = response.data?.experimental?.quotaToast;
            if (isPlainObject(quotaToastConfig)) {
                const config = cloneDefaultConfig();
                const settingSources = {};
                const configIssues = [];
                applyValidatedQuotaToastPatch(config, extractValidatedQuotaToastPatch(quotaToastConfig, (key, message) => {
                    configIssues.push({ path: "client.config.get", key, message });
                }), "client.config.get", settingSources);
                if (hasOwnKey(quotaToastConfig, "alibabaCodingPlanTier")) {
                    configIssues.push({
                        path: "client.config.get",
                        key: "alibabaCodingPlanTier",
                        message: 'removed in v4; tune Alibaba through "quotaProviders"',
                    });
                }
                if (hasOwnKey(quotaToastConfig, "customSources")) {
                    configIssues.push({
                        path: "client.config.get",
                        key: "customSources",
                        message: 'removed in v4; use the global-only "quotaProviders" property',
                    });
                }
                if (hasOwnKey(quotaToastConfig, "quotaProviders")) {
                    configIssues.push({
                        path: "client.config.get",
                        key: "quotaProviders",
                        message: "file provenance is required; define quotaProviders in global config",
                    });
                }
                if (meta) {
                    meta.source = "sdk";
                    meta.paths = ["client.config.get"];
                    meta.globalConfigPaths = [];
                    meta.workspaceConfigPaths = [];
                    meta.settingSources = settingSources;
                    meta.networkSettingSources = projectNetworkSettingSources(settingSources);
                    meta.configIssues = configIssues;
                }
                return config;
            }
        }
        catch {
            // ignore; fall back to defaults below
        }
    }
    if (meta) {
        meta.source = "defaults";
        meta.paths = [];
        meta.globalConfigPaths = [];
        meta.workspaceConfigPaths = [];
        meta.settingSources = {};
        meta.networkSettingSources = {};
        meta.configIssues = [];
    }
    return cloneDefaultConfig();
}
//# sourceMappingURL=config.js.map