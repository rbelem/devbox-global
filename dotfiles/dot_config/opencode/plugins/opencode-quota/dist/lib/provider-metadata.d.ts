export type QuotaProviderAutoSetup = "yes" | "usually" | "manual_env_config" | "needs_quick_setup";
export type QuotaProviderAuthentication = "opencode_auth_oauth_token" | "opencode_auth_api_key" | "companion_auth_oauth_token" | "local_cli_auth" | "github_oauth_or_pat" | "external_api_key" | "state_only";
export type QuotaProviderAuthFallback = "env_api_key" | "global_opencode_config";
export type QuotaProviderQuotaSource = "remote_api" | "local_estimation" | "local_runtime_accounting" | "local_cli_report";
declare const PROVIDER_CATALOG_SOURCE: {
    readonly anthropic: {
        readonly label: "Anthropic";
        readonly runtimeIds: readonly ["anthropic"];
        readonly synonyms: readonly ["claude", "claude-code"];
        readonly shape: {
            readonly autoSetup: "needs_quick_setup";
            readonly authentication: "local_cli_auth";
            readonly quota: "local_cli_report";
            readonly quickSetupAnchor: "anthropic-claude";
        };
    };
    readonly copilot: {
        readonly label: "Copilot";
        readonly runtimeIds: readonly ["copilot", "github-copilot", "copilot-chat", "github-copilot-chat"];
        readonly synonyms: readonly ["github-copilot", "copilot-chat", "github-copilot-chat"];
        readonly shape: {
            readonly autoSetup: "usually";
            readonly authentication: "github_oauth_or_pat";
            readonly quota: "remote_api";
            readonly notes: "OAuth for personal flow; PAT for managed billing";
        };
    };
    readonly openai: {
        readonly label: "OpenAI";
        readonly runtimeIds: readonly ["openai", "chatgpt", "codex"];
        readonly synonyms: readonly [];
        readonly shape: {
            readonly autoSetup: "yes";
            readonly authentication: "opencode_auth_oauth_token";
            readonly quota: "remote_api";
        };
    };
    readonly openrouter: {
        readonly label: "OpenRouter";
        readonly runtimeIds: readonly ["openrouter"];
        readonly synonyms: readonly [];
        readonly shape: {
            readonly autoSetup: "yes";
            readonly authentication: "opencode_auth_api_key";
            readonly authFallbacks: readonly ["env_api_key", "global_opencode_config"];
            readonly quota: "remote_api";
        };
    };
    readonly kilo: {
        readonly label: "Kilo Gateway";
        readonly runtimeIds: readonly ["kilo"];
        readonly synonyms: readonly [];
        readonly shape: {
            readonly autoSetup: "usually";
            readonly authentication: "opencode_auth_api_key";
            readonly authFallbacks: readonly ["env_api_key", "global_opencode_config"];
            readonly quota: "remote_api";
            readonly notes: "Queries Kilo Pass state first, then falls back to the documented personal Gateway balance when no active subscription exists";
        };
    };
    readonly cursor: {
        readonly label: "Cursor";
        readonly runtimeIds: readonly ["cursor", "cursor-acp"];
        readonly synonyms: readonly ["cursor-acp", "open-cursor", "@rama_nigg/open-cursor"];
        readonly liveLocalUsage: true;
        readonly shape: {
            readonly autoSetup: "needs_quick_setup";
            readonly authentication: "companion_auth_oauth_token";
            readonly quota: "local_runtime_accounting";
            readonly quickSetupAnchor: "cursor";
            readonly notes: "companion runtime/plugin integration plus local usage accounting";
        };
    };
    readonly "qwen-code": {
        readonly label: "Qwen";
        readonly runtimeIds: readonly ["qwen-code"];
        readonly synonyms: readonly ["qwen"];
        readonly liveLocalUsage: true;
        readonly shape: {
            readonly autoSetup: "needs_quick_setup";
            readonly authentication: "companion_auth_oauth_token";
            readonly quota: "local_estimation";
            readonly quickSetupAnchor: "qwen-code";
        };
    };
    readonly "alibaba-coding-plan": {
        readonly label: "Alibaba Coding Plan";
        readonly runtimeIds: readonly ["alibaba-coding-plan"];
        readonly synonyms: readonly ["alibaba"];
        readonly liveLocalUsage: true;
        readonly shape: {
            readonly autoSetup: "yes";
            readonly authentication: "opencode_auth_api_key";
            readonly authFallbacks: readonly ["env_api_key", "global_opencode_config"];
            readonly quota: "local_estimation";
        };
    };
    readonly synthetic: {
        readonly label: "Synthetic";
        readonly runtimeIds: readonly ["synthetic"];
        readonly synonyms: readonly [];
        readonly shape: {
            readonly autoSetup: "yes";
            readonly authentication: "opencode_auth_api_key";
            readonly authFallbacks: readonly ["env_api_key", "global_opencode_config"];
            readonly quota: "remote_api";
        };
    };
    readonly chutes: {
        readonly label: "Chutes";
        readonly runtimeIds: readonly ["chutes", "chutes-ai"];
        readonly synonyms: readonly [];
        readonly shape: {
            readonly autoSetup: "usually";
            readonly authentication: "opencode_auth_api_key";
            readonly authFallbacks: readonly ["env_api_key", "global_opencode_config"];
            readonly quota: "remote_api";
        };
    };
    readonly "google-antigravity": {
        readonly label: "Google";
        readonly runtimeIds: readonly ["google-antigravity", "google", "antigravity"];
        readonly synonyms: readonly [];
        readonly shape: {
            readonly autoSetup: "needs_quick_setup";
            readonly authentication: "companion_auth_oauth_token";
            readonly quota: "remote_api";
            readonly quickSetupAnchor: "google-antigravity";
        };
    };
    readonly "google-gemini-cli": {
        readonly label: "Gemini CLI";
        readonly runtimeIds: readonly ["google-gemini-cli", "gemini-cli", "gemini", "opencode-gemini-auth", "google"];
        readonly synonyms: readonly ["gemini-cli", "google-gemini", "opencode-gemini-auth", "gemini"];
        readonly shape: {
            readonly lifecycle: "deprecated";
            readonly recommendedReplacementId: "google-agy";
            readonly autoSetup: "needs_quick_setup";
            readonly authentication: "companion_auth_oauth_token";
            readonly quota: "remote_api";
            readonly quickSetupAnchor: "gemini-cli";
        };
    };
    readonly "google-agy": {
        readonly label: "Google AGY";
        readonly runtimeIds: readonly ["google-agy", "opencode-agy-auth", "google-agy-auth"];
        readonly synonyms: readonly ["opencode-agy-auth", "google-agy-auth"];
        readonly shape: {
            readonly autoSetup: "needs_quick_setup";
            readonly authentication: "companion_auth_oauth_token";
            readonly quota: "remote_api";
            readonly quickSetupAnchor: "google-agy-quick-setup";
        };
    };
    readonly zai: {
        readonly label: "Z.ai";
        readonly runtimeIds: readonly ["zai", "glm", "zai-coding-plan"];
        readonly synonyms: readonly [];
        readonly shape: {
            readonly autoSetup: "yes";
            readonly authentication: "opencode_auth_api_key";
            readonly authFallbacks: readonly ["env_api_key", "global_opencode_config"];
            readonly quota: "remote_api";
        };
    };
    readonly zhipu: {
        readonly label: "Zhipu";
        readonly runtimeIds: readonly ["zhipu", "glm-coding-plan", "zhipu-coding-plan", "zhipuai-coding-plan"];
        readonly synonyms: readonly ["glm-coding-plan", "zhipu-coding-plan", "zhipuai-coding-plan"];
        readonly shape: {
            readonly autoSetup: "yes";
            readonly authentication: "opencode_auth_api_key";
            readonly authFallbacks: readonly ["env_api_key", "global_opencode_config"];
            readonly quota: "remote_api";
        };
    };
    readonly nanogpt: {
        readonly label: "NanoGPT";
        readonly runtimeIds: readonly ["nanogpt", "nano-gpt"];
        readonly synonyms: readonly ["nano-gpt"];
        readonly shape: {
            readonly autoSetup: "usually";
            readonly authentication: "opencode_auth_api_key";
            readonly authFallbacks: readonly ["env_api_key", "global_opencode_config"];
            readonly quota: "remote_api";
        };
    };
    readonly "minimax-coding-plan": {
        readonly label: "MiniMax Coding Plan";
        readonly runtimeIds: readonly ["minimax-coding-plan", "minimax"];
        readonly synonyms: readonly ["minimax"];
        readonly shape: {
            readonly autoSetup: "yes";
            readonly authentication: "opencode_auth_api_key";
            readonly authFallbacks: readonly ["env_api_key", "global_opencode_config"];
            readonly quota: "remote_api";
        };
    };
    readonly "minimax-china-coding-plan": {
        readonly label: "MiniMax Coding Plan (CN)";
        readonly labelAliases: readonly ["minimax-cn-coding-plan"];
        readonly runtimeIds: readonly ["minimax-china-coding-plan", "minimax-cn-coding-plan", "minimax-cn", "minimax-china"];
        readonly synonyms: readonly ["minimax-cn", "minimax-china", "minimax-cn-coding-plan"];
        readonly shape: {
            readonly autoSetup: "yes";
            readonly authentication: "opencode_auth_api_key";
            readonly authFallbacks: readonly ["env_api_key", "global_opencode_config"];
            readonly quota: "remote_api";
        };
    };
    readonly "kimi-for-coding": {
        readonly label: "Kimi Code";
        readonly labelAliases: readonly ["kimi-code"];
        readonly runtimeIds: readonly ["kimi-for-coding", "kimi", "kimi-code"];
        readonly synonyms: readonly ["kimi", "kimi-for-code", "kimi-code"];
        readonly shape: {
            readonly autoSetup: "yes";
            readonly authentication: "opencode_auth_api_key";
            readonly authFallbacks: readonly ["env_api_key", "global_opencode_config"];
            readonly quota: "remote_api";
        };
    };
    readonly deepseek: {
        readonly label: "DeepSeek";
        readonly runtimeIds: readonly ["deepseek"];
        readonly synonyms: readonly ["deep-seek"];
        readonly shape: {
            readonly autoSetup: "yes";
            readonly authentication: "opencode_auth_api_key";
            readonly authFallbacks: readonly ["env_api_key", "global_opencode_config"];
            readonly quota: "remote_api";
        };
    };
    readonly xai: {
        readonly label: "xAI";
        readonly runtimeIds: readonly ["xai"];
        readonly synonyms: readonly [];
        readonly shape: {
            readonly autoSetup: "yes";
            readonly authentication: "opencode_auth_oauth_token";
            readonly quota: "remote_api";
            readonly notes: "SuperGrok OAuth via OpenCode /connect; shared weekly credit meter";
        };
    };
    readonly xiaomi: {
        readonly label: "Xiaomi MiMo";
        readonly runtimeIds: readonly ["xiaomi", "xiaomi-token-plan-cn", "xiaomi-token-plan-ams", "xiaomi-token-plan-sgp"];
        readonly synonyms: readonly ["xiaomi-token-plan-cn", "xiaomi-token-plan-ams", "xiaomi-token-plan-sgp"];
        readonly shape: {
            readonly autoSetup: "needs_quick_setup";
            readonly authentication: "state_only";
            readonly quota: "remote_api";
            readonly quickSetupAnchor: "xiaomi-mimo";
            readonly notes: "Reads the Xiaomi MiMo dashboard with a filtered trusted cookie";
        };
    };
    readonly "opencode-go": {
        readonly label: "OpenCode Go";
        readonly runtimeIds: readonly ["opencode-go"];
        readonly synonyms: readonly ["opencode-go-subscription"];
        readonly shape: {
            readonly autoSetup: "yes";
            readonly authentication: "opencode_auth_api_key";
            readonly authFallbacks: readonly ["env_api_key", "global_opencode_config"];
            readonly quota: "remote_api";
            readonly notes: "Reads the official OpenCode Go usage API through standard Go API-key sources";
        };
    };
    readonly opencode: {
        readonly label: "OpenCode Zen";
        readonly runtimeIds: readonly ["opencode", "opencode-zen"];
        readonly synonyms: readonly ["opencode-zen"];
        readonly shape: {
            readonly autoSetup: "needs_quick_setup";
            readonly authentication: "state_only";
            readonly quota: "remote_api";
            readonly quickSetupAnchor: "opencode-zen";
            readonly notes: "Scrapes the OpenCode Zen billing page; requires workspaceId and authCookie";
        };
    };
    readonly "ollama-cloud": {
        readonly label: "Ollama Cloud";
        readonly runtimeIds: readonly ["ollama-cloud"];
        readonly synonyms: readonly [];
        readonly shape: {
            readonly autoSetup: "usually";
            readonly authentication: "opencode_auth_api_key";
            readonly authFallbacks: readonly ["env_api_key", "global_opencode_config"];
            readonly quota: "remote_api";
            readonly notes: "Queries the Ollama Cloud usage API; reports session and weekly quota plus model request counts";
        };
    };
    readonly "quota-providers": {
        readonly label: "Quota providers";
        readonly runtimeIds: readonly [];
        readonly synonyms: readonly [];
        readonly shape: {
            readonly autoSetup: "manual_env_config";
            readonly authentication: "external_api_key";
            readonly authFallbacks: readonly ["env_api_key", "global_opencode_config"];
            readonly quota: "remote_api";
            readonly notes: "Aggregates exact user-configured accounting sources";
        };
    };
};
export type CanonicalQuotaProviderId = keyof typeof PROVIDER_CATALOG_SOURCE;
export interface QuotaProviderShape {
    id: CanonicalQuotaProviderId;
    lifecycle?: "deprecated";
    recommendedReplacementId?: CanonicalQuotaProviderId;
    autoSetup: QuotaProviderAutoSetup;
    authentication: QuotaProviderAuthentication;
    authFallbacks?: QuotaProviderAuthFallback[];
    quota: QuotaProviderQuotaSource;
    quickSetupAnchor?: string;
    notes?: string;
}
export interface QuotaProviderCatalogEntry {
    label: string;
    labelAliases: readonly string[];
    runtimeIds: readonly string[];
    synonyms: readonly string[];
    shape: QuotaProviderShape;
}
export type QuotaProviderRuntimeIds = Readonly<Record<CanonicalQuotaProviderId, readonly string[]>>;
export declare const QUOTA_PROVIDER_CATALOG: Readonly<Record<CanonicalQuotaProviderId, QuotaProviderCatalogEntry>>;
export declare const QUOTA_PROVIDER_LABELS: Readonly<Record<string, string>>;
export declare const QUOTA_PROVIDER_ID_SYNONYMS: Readonly<Record<string, string>>;
export declare const QUOTA_PROVIDER_RUNTIME_IDS: QuotaProviderRuntimeIds;
export declare const QUOTA_PROVIDER_SHAPES: readonly QuotaProviderShape[];
export declare function normalizeQuotaProviderId(id: string): string;
export declare function getQuotaProviderShape(id: string): QuotaProviderShape | undefined;
export declare function getQuotaProviderDisplayLabel(id: string): string;
export declare function getQuotaProviderRuntimeIds(id: string): readonly string[];
export declare function getQuotaProviderIdsForRuntimeId(id: string): readonly CanonicalQuotaProviderId[];
export declare function isLiveLocalUsageProviderId(id: string): boolean;
export {};
//# sourceMappingURL=provider-metadata.d.ts.map