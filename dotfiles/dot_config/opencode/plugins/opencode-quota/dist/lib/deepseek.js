/**
 * DeepSeek balance fetcher.
 *
 * Queries: GET https://api.deepseek.com/user/balance
 * Auth: Bearer token in Authorization header.
 */
import { resolveDeepSeekApiKey, } from "./deepseek-auth.js";
import { sanitizeDisplaySnippet, sanitizeDisplayText } from "./display-sanitize.js";
import { fetchWithTimeout } from "./http.js";
const DEEPSEEK_BALANCE_URL = "https://api.deepseek.com/user/balance";
const USER_AGENT = "OpenCode-Quota-Toast/1.0";
const CURRENCY_SYMBOLS = {
    CNY: "\u00A5", // ¥
    USD: "$",
};
function isRecord(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function getNonEmptyString(value) {
    return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}
const DEEPSEEK_DECIMAL_BALANCE_RE = /^(?:0|[1-9]\d*)(?:\.\d{1,18})?$/u;
function normalizeDeepSeekBalance(value) {
    const raw = getNonEmptyString(value);
    if (!raw || raw.length > 64 || !DEEPSEEK_DECIMAL_BALANCE_RE.test(raw)) {
        return "0.00";
    }
    return raw;
}
function parseDeepSeekBalance(payload) {
    if (!isRecord(payload)) {
        throw new Error("DeepSeek balance response returned an unexpected response shape");
    }
    const isAvailable = typeof payload.is_available === "boolean" ? payload.is_available : false;
    const balanceInfos = [];
    const rawInfos = payload.balance_infos;
    if (Array.isArray(rawInfos)) {
        for (const info of rawInfos) {
            if (!isRecord(info))
                continue;
            const currency = getNonEmptyString(info.currency);
            if (!currency || !["CNY", "USD"].includes(currency.toUpperCase()))
                continue;
            balanceInfos.push({
                currency: currency.toUpperCase(),
                totalBalance: normalizeDeepSeekBalance(info.total_balance),
                grantedBalance: normalizeDeepSeekBalance(info.granted_balance),
                toppedUpBalance: normalizeDeepSeekBalance(info.topped_up_balance),
            });
        }
    }
    return { isAvailable, balanceInfos };
}
async function fetchDeepSeekBalance(apiKey, requestTimeoutMs) {
    try {
        return await fetchWithTimeout(DEEPSEEK_BALANCE_URL, {
            request: {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    "User-Agent": USER_AGENT,
                },
            },
            timeoutMs: requestTimeoutMs,
            consume: async (response) => {
                if (!response.ok) {
                    const text = await response.text();
                    return {
                        success: false,
                        message: `DeepSeek API error ${response.status}: ${sanitizeDisplaySnippet(text, 120)}`,
                    };
                }
                return {
                    success: true,
                    data: parseDeepSeekBalance(await response.json()),
                };
            },
        });
    }
    catch (err) {
        return {
            success: false,
            message: sanitizeDisplayText(err instanceof Error ? err.message : String(err)),
        };
    }
}
/**
 * Format a balance value with the appropriate currency symbol.
 */
export function formatDeepSeekBalanceValue(balance) {
    const symbol = CURRENCY_SYMBOLS[balance.currency] ?? balance.currency;
    return `${symbol}${balance.totalBalance}`;
}
/**
 * Query DeepSeek balance from the API.
 *
 * @returns A typed result with success/error state, or null if no API key is configured.
 */
export async function queryDeepSeekBalance(options = {}) {
    const resolved = await resolveDeepSeekApiKey();
    if (!resolved)
        return null;
    const result = await fetchDeepSeekBalance(resolved.key, options.requestTimeoutMs);
    if (!result.success) {
        return { success: false, error: result.message };
    }
    return {
        success: true,
        isAvailable: result.data.isAvailable,
        balanceInfos: result.data.balanceInfos,
    };
}
export { getDeepSeekKeyDiagnostics, hasDeepSeekApiKey as hasDeepSeekApiKeyConfigured, } from "./deepseek-auth.js";
//# sourceMappingURL=deepseek.js.map