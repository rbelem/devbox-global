/**
 * HTTP utilities for provider API calls.
 */
export type FetchWithTimeoutOptions<T> = {
    request: Omit<RequestInit, "signal">;
    timeoutMs?: number;
    fetchFn?: typeof fetch;
    consume: (response: Response, timeoutSignal: AbortSignal) => Promise<T> | T;
};
/**
 * Fetch and consume a response within one timeout.
 *
 * The response consumer must complete all status handling, body reads, and parsing
 * before returning so the request signal remains active for the full transaction.
 *
 * @throws Error with message "Request timeout after Xs" if the transaction times out
 */
export declare function fetchWithTimeout<T>(url: string, options: FetchWithTimeoutOptions<T>): Promise<T>;
//# sourceMappingURL=http.d.ts.map