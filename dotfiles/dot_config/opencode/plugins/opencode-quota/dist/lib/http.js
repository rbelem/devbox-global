/**
 * HTTP utilities for provider API calls.
 */
import { REQUEST_TIMEOUT_MS } from "./types.js";
/**
 * Fetch and consume a response within one timeout.
 *
 * The response consumer must complete all status handling, body reads, and parsing
 * before returning so the request signal remains active for the full transaction.
 *
 * @throws Error with message "Request timeout after Xs" if the transaction times out
 */
export async function fetchWithTimeout(url, options) {
    const timeoutMs = options.timeoutMs ?? REQUEST_TIMEOUT_MS;
    const controller = new AbortController();
    let timedOut = false;
    const timeoutErrorMessage = `Request timeout after ${Math.round(timeoutMs / 1000)}s`;
    let timeoutId;
    const timeout = new Promise((_resolve, reject) => {
        timeoutId = setTimeout(() => {
            timedOut = true;
            controller.abort();
            reject(new Error(timeoutErrorMessage));
        }, timeoutMs);
    });
    try {
        const transaction = (async () => {
            const fetchFn = options.fetchFn ?? globalThis.fetch;
            const response = await fetchFn(url, {
                ...options.request,
                signal: controller.signal,
            });
            return await options.consume(response, controller.signal);
        })();
        return await Promise.race([transaction, timeout]);
    }
    catch (err) {
        if (timedOut) {
            throw new Error(timeoutErrorMessage);
        }
        throw err;
    }
    finally {
        clearTimeout(timeoutId);
    }
}
//# sourceMappingURL=http.js.map