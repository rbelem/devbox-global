/**
 * Google Antigravity quota fetcher
 *
 * Uses OpenCode's antigravity-accounts.json at ~/.config/opencode/antigravity-accounts.json.
 * Requires the user to have opencode-antigravity-auth installed and logged in.
 */
import type { AntigravityAccount, GoogleModelId, GoogleResult } from "./types.js";
export interface GoogleAntigravityAuthPresence {
    state: "missing" | "present" | "invalid";
    selectedPath?: string;
    presentPaths: string[];
    candidatePaths: string[];
    accountCount: number;
    validAccountCount: number;
    error?: string;
}
export declare function getAntigravityAccountsCandidatePaths(): string[];
export declare function pickAntigravityAccountsPath(): string;
/**
 * Read Antigravity accounts from storage
 */
export declare function readAntigravityAccounts(): Promise<AntigravityAccount[] | null>;
export declare function inspectAntigravityAccountsPresence(): Promise<GoogleAntigravityAuthPresence>;
export declare function hasAntigravityAccountsConfigured(): Promise<boolean>;
export declare function hasAntigravityQuotaRuntimeAvailable(): Promise<boolean>;
export declare function refreshGoogleTokensForAllAccounts(params?: {
    skewMs?: number;
    force?: boolean;
}): Promise<null | {
    total: number;
    successCount: number;
    failures: Array<{
        email?: string;
        error: string;
    }>;
}>;
/**
 * Query Google Antigravity quota for ALL accounts
 *
 * Reads accounts from ~/.config/opencode/antigravity-accounts.json.
 * Refreshes access tokens and fetches quota for all accounts in parallel.
 *
 * @param modelIds - Model IDs to fetch quota for
 * @returns Quota result with all models and any errors, or null if not configured
 */
export declare function queryGoogleQuota(modelIds: GoogleModelId[], options?: {
    requestTimeoutMs?: number;
}): Promise<GoogleResult>;
/**
 * Format Google quota for toast display
 *
 * @param result - Google quota result
 * @returns Formatted string like "G3Pro 100% * G3Flash 100% * Claude 0%" or null
 */
export declare function formatGoogleQuota(result: GoogleResult): string | null;
//# sourceMappingURL=google.d.ts.map