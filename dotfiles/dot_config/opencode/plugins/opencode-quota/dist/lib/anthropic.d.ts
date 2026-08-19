/**
 * Anthropic Claude quota probing.
 *
 * Uses the local Claude CLI/runtime to detect install/auth state first. When
 * Claude auth is confirmed but local quota windows are missing, it falls back
 * to Anthropic's OAuth usage endpoint using the first usable OAuth access
 * token: OpenCode's own auth.json, then Claude OAuth credentials (macOS
 * Keychain first, then the local credentials file).
 */
export interface AnthropicQuotaWindow {
    utilization?: number;
    used_percentage?: number;
    usedPercentage?: number;
    used_percent?: number;
    usedPercent?: number;
    percent_used?: number;
    percentUsed?: number;
    resets_at?: string;
    resetsAt?: string;
    reset_at?: string;
    resetAt?: string;
}
export interface AnthropicUsageResponse {
    five_hour: AnthropicQuotaWindow;
    seven_day: AnthropicQuotaWindow;
}
export interface AnthropicQuotaResult {
    success: true;
    five_hour: {
        percentRemaining: number;
        resetTimeIso?: string;
    };
    seven_day: {
        percentRemaining: number;
        resetTimeIso?: string;
    };
}
export interface AnthropicQuotaError {
    success: false;
    error: string;
}
export type AnthropicResult = AnthropicQuotaResult | AnthropicQuotaError | null;
export type AnthropicAuthStatus = "authenticated" | "unauthenticated" | "unknown";
export type AnthropicQuotaSource = "claude-auth-status-json" | "claude-credentials-oauth-api" | "opencode-auth-oauth-api" | "none";
export interface AnthropicDiagnostics {
    installed: boolean;
    version: string | null;
    authStatus: AnthropicAuthStatus;
    quotaSupported: boolean;
    quotaSource: AnthropicQuotaSource;
    /** Credential store that supplied the OAuth token for the usage probe. */
    oauthCredentialSource?: AnthropicCredentialSource;
    checkedCommands: string[];
    message?: string;
    quota?: AnthropicQuotaResult;
}
export interface AnthropicProbeOptions {
    binaryPath?: string;
    requestTimeoutMs?: number;
}
export type ClaudeCommandInvocation = {
    file: string;
    args: string[];
    display: string;
};
/** Which credential store provided the OAuth access token used for the usage probe. */
export type AnthropicCredentialSource = "opencode-auth" | "claude-credentials";
export declare function resolveAnthropicBinaryPath(binaryPath?: string): string;
export declare function buildClaudeCommandInvocation(binaryPath: string, args: string[], runtime?: {
    platform?: NodeJS.Platform;
    comspec?: string;
}): ClaudeCommandInvocation;
declare function parseUsageResponse(data: unknown): AnthropicQuotaResult | null;
export declare function clearAnthropicDiagnosticsCacheForTests(): void;
export declare function getAnthropicDiagnostics(options?: AnthropicProbeOptions): Promise<AnthropicDiagnostics>;
export declare function hasAnthropicCredentialsConfigured(options?: AnthropicProbeOptions): Promise<boolean>;
export declare function queryAnthropicQuota(options?: AnthropicProbeOptions): Promise<AnthropicResult>;
export { parseUsageResponse };
//# sourceMappingURL=anthropic.d.ts.map