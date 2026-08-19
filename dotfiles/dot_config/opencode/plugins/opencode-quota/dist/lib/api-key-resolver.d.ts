/**
 * Generic API key resolution from env vars, config files, and auth.json.
 *
 * Used by provider-specific config modules (synthetic-config, chutes-config)
 * to resolve API keys with consistent priority and behavior.
 */
/** A candidate config file path with its format */
export interface ConfigCandidate {
    path: string;
    isJsonc: boolean;
}
/**
 * Get candidate paths for opencode.json/opencode.jsonc files.
 *
 * Order: local (cwd) first, then global (~/.config/opencode).
 * Within each location, .jsonc takes precedence over .json.
 */
export declare function getOpencodeConfigCandidatePaths(): ConfigCandidate[];
/**
 * Get trusted global-only candidate paths for opencode.json/opencode.jsonc files.
 *
 * Provider secrets must not be sourced from repo-local config because the
 * current workspace may be untrusted.
 */
export declare function getGlobalOpencodeConfigCandidatePaths(): ConfigCandidate[];
/**
 * Read and parse an opencode config file.
 *
 * @returns Parsed config with metadata, or null if file doesn't exist or is invalid
 */
export declare function readOpencodeConfig(filePath: string, isJsonc: boolean): Promise<{
    config: unknown;
    path: string;
    isJsonc: boolean;
} | null>;
/** Result of API key resolution */
export interface ApiKeyResult<Source extends string> {
    key: string;
    source: Source;
}
/** Environment variable definition for key resolution */
export interface EnvVarDef<Source extends string> {
    name: string;
    source: Source;
}
export declare function getFirstAuthEntryValue(auth: unknown, authKeys: readonly string[]): unknown;
export declare function getFirstAuthEntryRecord(auth: unknown, authKeys: readonly string[]): Record<string, unknown> | null;
export declare function extractProviderOptionsApiKey(config: unknown, params: {
    providerKeys: readonly string[];
    allowedEnvVars?: readonly string[];
}): string | null;
export declare function extractAuthApiKeyEntry(auth: unknown, authKeys: readonly string[]): string | null;
/** Configuration for resolving an API key from trusted env/config sources */
export interface ResolveEnvAndConfigApiKeyConfig<Source extends string> {
    /** Environment variables to check (in order) */
    envVars: EnvVarDef<Source>[];
    /** Extract API key from parsed config object. Returns null if not found. */
    extractFromConfig: (config: unknown) => string | null;
    /** Source label for opencode.json */
    configJsonSource: Source;
    /** Source label for opencode.jsonc */
    configJsoncSource: Source;
    /**
     * Candidate config file paths to trust for provider-secret lookup.
     *
     * Defaults to trusted user/global OpenCode config paths only.
     */
    getConfigCandidates?: () => ConfigCandidate[];
}
/** Configuration for resolving an API key from multiple sources */
export interface ResolveApiKeyConfig<Source extends string> extends ResolveEnvAndConfigApiKeyConfig<Source> {
    /** Extract API key from auth.json data. Returns null if not found. */
    extractFromAuth: (auth: unknown) => string | null;
    /** Source label for auth.json */
    authSource: Source;
}
/** Shared configuration for provider-specific API key resolution. */
export interface ResolveProviderApiKeyBaseConfig<Source extends string> {
    envVars: EnvVarDef<Source>[];
    providerKeys: readonly string[];
    allowedEnvVars?: readonly string[];
    configJsonSource: Source;
    configJsoncSource: Source;
    getConfigCandidates?: () => ConfigCandidate[];
}
export interface StrictApiKeyAuthConfig<Source extends string> {
    policy?: "strict-api-key";
    readAuth: () => Promise<unknown | null>;
    getAuthPaths?: () => string[];
    authKeys?: readonly string[];
    authSource: Source;
}
export interface InvalidAwareApiKeyAuthConfig<AuthSource extends string> {
    policy: "invalid-aware-api-key";
    readAuth: (maxAgeMs: number) => Promise<unknown | null>;
    getAuthPaths: () => string[];
    authKeys: readonly string[];
    authSource: AuthSource;
    displayName: string;
    defaultMaxAgeMs: number;
    unsupportedTypeError?: string;
}
/** Configuration for simple nullable API key resolution. */
export interface ResolveProviderApiKeyConfig<Source extends string> extends ResolveProviderApiKeyBaseConfig<Source> {
    auth?: StrictApiKeyAuthConfig<Source>;
}
/** Configuration for providers that surface malformed winning auth.json entries. */
export interface ResolveInvalidAwareProviderApiKeyConfig<Source extends string, AuthSource extends Source> extends ResolveProviderApiKeyBaseConfig<Source> {
    auth: InvalidAwareApiKeyAuthConfig<AuthSource>;
}
export type InvalidAwareAuthResult = {
    state: "none";
} | {
    state: "configured";
    apiKey: string;
} | {
    state: "invalid";
    error: string;
};
export type InvalidAwareAuthDiagnostics<Source extends string, AuthSource extends Source> = {
    state: "none";
    source: null;
    checkedPaths: string[];
    authPaths: string[];
} | {
    state: "configured";
    source: Source;
    checkedPaths: string[];
    authPaths: string[];
} | {
    state: "invalid";
    source: AuthSource;
    checkedPaths: string[];
    authPaths: string[];
    error: string;
};
export interface ProviderApiKeyResolver<Source extends string> {
    resolve: () => Promise<ApiKeyResult<Source> | null>;
    has: () => Promise<boolean>;
    diagnostics: () => Promise<{
        configured: boolean;
        source: Source | null;
        checkedPaths: string[];
        authPaths: string[];
    }>;
}
export interface InvalidAwareProviderApiKeyResolver<Source extends string, AuthSource extends Source> {
    parseAuth: (auth: unknown) => InvalidAwareAuthResult;
    resolve: (params?: {
        maxAgeMs?: number;
    }) => Promise<InvalidAwareAuthResult>;
    diagnostics: (params?: {
        maxAgeMs?: number;
    }) => Promise<InvalidAwareAuthDiagnostics<Source, AuthSource>>;
}
export interface ApiKeyCheckedPathsConfig {
    /** Environment variable names to check */
    envVarNames: string[];
    /**
     * Candidate config file paths to report for provider-secret lookup.
     *
     * Defaults to trusted user/global OpenCode config paths only.
     */
    getConfigCandidates?: () => ConfigCandidate[];
}
export declare function createProviderApiKeyResolver<Source extends string, AuthSource extends Source>(config: ResolveInvalidAwareProviderApiKeyConfig<Source, AuthSource>): InvalidAwareProviderApiKeyResolver<Source, AuthSource>;
export declare function createProviderApiKeyResolver<Source extends string>(config: ResolveProviderApiKeyConfig<Source>): ProviderApiKeyResolver<Source>;
/**
 * Resolve an API key from trusted env vars and config files.
 *
 * Priority (first wins):
 * 1. Environment variables (in order specified)
 * 2. Trusted user/global opencode.json/opencode.jsonc candidates
 */
export declare function resolveApiKeyFromEnvAndConfig<Source extends string>(config: ResolveEnvAndConfigApiKeyConfig<Source>): Promise<ApiKeyResult<Source> | null>;
export declare function getApiKeyCheckedPaths(config: ApiKeyCheckedPathsConfig): string[];
/**
 * Resolve an API key from multiple sources with consistent priority.
 *
 * Priority (first wins):
 * 1. Environment variables (in order specified)
 * 2. Trusted user/global opencode.json/opencode.jsonc
 * 3. auth.json
 *
 * @returns API key and source, or null if not found
 */
export declare function resolveApiKey<Source extends string>(config: ResolveApiKeyConfig<Source>, readAuth: () => Promise<unknown | null>): Promise<ApiKeyResult<Source> | null>;
export declare function resolveProviderApiKey<Source extends string>(config: ResolveProviderApiKeyConfig<Source>): Promise<ApiKeyResult<Source> | null>;
/** Configuration for API key diagnostics */
export interface DiagnosticsConfig<Source extends string> {
    /** Environment variable names to check */
    envVarNames: string[];
    /** Resolver function to get the current key result */
    resolve: () => Promise<ApiKeyResult<Source> | null>;
    /** Candidate config file paths to report for provider-secret lookup. */
    getConfigCandidates?: () => ConfigCandidate[];
}
/**
 * Get diagnostic info about API key configuration.
 *
 * Reports which sources were checked (env vars that exist, config files that exist)
 * and whether a key was found.
 */
export declare function getApiKeyDiagnostics<Source extends string>(config: DiagnosticsConfig<Source>): Promise<{
    configured: boolean;
    source: Source | null;
    checkedPaths: string[];
}>;
//# sourceMappingURL=api-key-resolver.d.ts.map