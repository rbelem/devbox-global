/**
 * Persistent access-token cache for Google Antigravity accounts.
 *
 * Why:
 * - Antigravity quota is multi-account; each account needs its own access token.
 * - Refreshing on every toast is noisy and increases timeout risk.
 * - We persist access tokens so restarts don't force immediate refresh.
 */
export interface GoogleAccessTokenCacheEntry {
    accessToken: string;
    expiresAt: number;
    projectId: string;
    email?: string;
}
export declare function getGoogleTokenCachePath(): string;
export declare function makeAccountCacheKey(params: {
    refreshToken: string;
    projectId: string;
    email?: string;
}): string;
export declare function getCachedAccessToken(params: {
    key: string;
    skewMs: number;
}): Promise<GoogleAccessTokenCacheEntry | null>;
export declare function setCachedAccessToken(params: {
    key: string;
    entry: GoogleAccessTokenCacheEntry;
}): Promise<void>;
export declare function clearGoogleTokenCache(): Promise<void>;
//# sourceMappingURL=google-token-cache.d.ts.map