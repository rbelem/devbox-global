/**
 * Shared session-token fetching helper.
 *
 * Consolidates the duplicated try/catch + error-capture logic that was
 * previously inlined in both `fetchQuotaMessage()` and
 * `fetchQuotaCommandMessage()` in plugin.ts.
 */
import type { SessionTokensData } from "./entries.js";
import type { SessionTokenError } from "./quota-status.js";
import type { SessionTokenScope } from "./types.js";
export interface SessionTokenFetchResult {
    sessionTokens?: SessionTokensData;
    error?: SessionTokenError;
}
/**
 * Fetch session token summary for display.
 *
 * @returns `sessionTokens` on success (undefined if no data),
 *          `error` on failure (for diagnostics).
 *          When both are undefined the feature was disabled or sessionID missing.
 */
export declare function fetchSessionTokensForDisplay(params: {
    enabled: boolean;
    sessionID?: string;
    scope: SessionTokenScope;
}): Promise<SessionTokenFetchResult>;
//# sourceMappingURL=session-tokens.d.ts.map