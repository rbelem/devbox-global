/**
 * Type definitions for opencode-quota plugin
 */
import { DEFAULT_QUOTA_FORMAT_STYLE } from "./quota-format-style.js";
/** Request timeout in milliseconds */
export const REQUEST_TIMEOUT_MS = 5000;
/** Default configuration values */
export const DEFAULT_CONFIG = {
    enabled: true,
    enableToast: true,
    resetNotifications: {
        enabled: false,
        windows: ["weekly"],
    },
    tuiCommandDisplay: "inline",
    formatStyle: DEFAULT_QUOTA_FORMAT_STYLE,
    percentDisplayMode: "remaining",
    minIntervalMs: 300000, // 5 minutes
    requestTimeoutMs: REQUEST_TIMEOUT_MS,
    debug: false,
    // Providers are auto-detected by default; set to explicit list to opt-in manually.
    enabledProviders: "auto",
    quotaProviders: [],
    anthropicBinaryPath: "claude",
    // If Google Antigravity is enabled, default to Claude only.
    googleModels: ["CLAUDE"],
    cursorPlan: "none",
    opencodeGoWindows: ["rolling", "weekly", "monthly"],
    opencodeMonthlyLimit: undefined,
    pricingSnapshot: {
        source: "auto",
        autoRefresh: 7,
    },
    showOnIdle: true,
    showOnQuestion: true,
    showOnCompact: true,
    showOnBothFail: true,
    toastDurationMs: 9000,
    onlyCurrentModel: false,
    showSessionTokens: true,
    sessionTokenScope: "current",
    tuiSidebarPanel: {
        enabled: true,
    },
    tuiCompactStatus: {
        enabled: false,
        homeBottom: true,
        sessionPrompt: true,
        suppressWhenNativeProviderQuota: true,
        maxWidth: 96,
    },
    tuiPromptBar: {
        enabled: false,
    },
    maintainerAnnouncements: {
        enabled: true,
        home: true,
    },
    export: {
        enabled: false,
        path: "",
    },
    telemetry: {
        enabled: false,
    },
    layout: {
        maxWidth: 50,
        narrowAt: 42,
        tinyAt: 32,
    },
};
// =============================================================================
// Constants
// =============================================================================
/** Model key mapping for Google API */
export const GOOGLE_MODEL_KEYS = {
    G3PRO: {
        key: "gemini-3.1-pro",
        altKey: "gemini-3.1-pro-high|gemini-3.1-pro-low|gemini-3-pro-high|gemini-3-pro-low|gemini-3.5-pro-high|gemini-3.5-pro-low",
        display: "G3Pro",
    },
    G3FLASH: {
        key: "gemini-3-flash",
        altKey: "gemini-3-flash-medium|gemini-3-flash-high|gemini-3-flash-low|gemini-3-5-flash-medium|gemini-3-5-flash-high|gemini-3-5-flash-low|gemini-3.5-flash-medium|gemini-3.5-flash-high|gemini-3.5-flash-low",
        display: "G3Flash",
    },
    CLAUDE: {
        key: "claude-opus-4-6-thinking",
        altKey: "claude-opus-4-5-thinking|claude-opus-4-5|claude-sonnet-4-6|claude-sonnet-4-6-thinking|claude-opus-4-6|gemini-claude-sonnet-4-6|gemini-claude-opus-4-6-thinking",
        display: "Claude",
    },
    G3IMAGE: { key: "gemini-3-pro-image", display: "G3Image" },
    GPTOSS: {
        key: "gpt-oss-120b-medium",
        altKey: "gpt-oss-120b-high|gpt-oss-120b-low|gpt-oss-120b",
        display: "GPT-OSS",
    },
};
//# sourceMappingURL=types.js.map