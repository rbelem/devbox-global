/**
 * Kilo Gateway API client.
 *
 * Reports Kilo Pass credit totals and usage from the authenticated tRPC
 * subscription-state endpoint, with a balance-only fallback for accounts
 * without an active Kilo Pass.
 */
import { sanitizeSingleLineDisplayText } from "./display-sanitize.js";
import { fetchWithTimeout } from "./http.js";
import { resolveKiloApiKey } from "./kilo-config.js";
const KILO_PASS_STATE_ENDPOINT = "https://app.kilo.ai/api/trpc/kiloPass.getState";
const KILO_BALANCE_ENDPOINT = "https://api.kilo.ai/api/profile/balance";
const MAX_RESPONSE_BYTES = 64 * 1024;
function isRecord(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function sanitizeMessage(text, secret, maxLength = 200) {
    const redacted = secret ? text.split(secret).join("[redacted]") : text;
    return (sanitizeSingleLineDisplayText(redacted) || "unknown").slice(0, maxLength);
}
async function readResponseText(response, endpoint) {
    const reader = response.body?.getReader();
    if (!reader)
        return "";
    const chunks = [];
    let byteLength = 0;
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done)
                break;
            byteLength += value.byteLength;
            if (byteLength > MAX_RESPONSE_BYTES) {
                await reader.cancel().catch(() => undefined);
                throw new Error(`Kilo Gateway ${endpoint} API response exceeded ${MAX_RESPONSE_BYTES} bytes`);
            }
            chunks.push(value);
        }
    }
    finally {
        reader.releaseLock();
    }
    const bytes = new Uint8Array(byteLength);
    let offset = 0;
    for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.byteLength;
    }
    return new TextDecoder().decode(bytes);
}
function nonnegativeNumber(value) {
    return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}
function firstValidResetTimeIso(...values) {
    for (const value of values) {
        if (typeof value !== "string")
            continue;
        const timestamp = Date.parse(value);
        if (Number.isFinite(timestamp))
            return new Date(timestamp).toISOString();
    }
    return undefined;
}
function noActiveKiloPass() {
    return {
        success: false,
        reason: "no_active_subscription",
        error: "Kilo Gateway state API returned no active Kilo Pass subscription",
    };
}
function isNoActiveKiloPassResult(result) {
    return !result.success && "reason" in result && result.reason === "no_active_subscription";
}
function parseKiloPassState(payload) {
    const item = Array.isArray(payload) ? payload[0] : payload;
    if (!isRecord(item)) {
        return {
            success: false,
            error: "Kilo Gateway state API returned an unexpected response shape",
        };
    }
    const result = item.result;
    const data = isRecord(result) ? result.data : undefined;
    if (!isRecord(data)) {
        return {
            success: false,
            error: "Kilo Gateway state API returned an unexpected response shape",
        };
    }
    if ("json" in data && !isRecord(data.json)) {
        return {
            success: false,
            error: "Kilo Gateway state API returned an unexpected response shape",
        };
    }
    const root = isRecord(data.json) ? data.json : data;
    if (!isRecord(root)) {
        return {
            success: false,
            error: "Kilo Gateway state API returned an unexpected response shape",
        };
    }
    const subscription = root.subscription;
    if (subscription === null || !("subscription" in root)) {
        return noActiveKiloPass();
    }
    if (!isRecord(subscription)) {
        return {
            success: false,
            error: "Kilo Gateway state API returned an invalid Kilo Pass subscription",
        };
    }
    const baseCreditsUsd = nonnegativeNumber(subscription.currentPeriodBaseCreditsUsd);
    const usageUsd = nonnegativeNumber(subscription.currentPeriodUsageUsd);
    const rawBonusCreditsUsd = subscription.currentPeriodBonusCreditsUsd;
    const bonusCreditsUsd = rawBonusCreditsUsd === null || rawBonusCreditsUsd === undefined
        ? 0
        : nonnegativeNumber(rawBonusCreditsUsd);
    if (baseCreditsUsd === null) {
        return {
            success: false,
            error: "Kilo Gateway state API returned invalid currentPeriodBaseCreditsUsd",
        };
    }
    if (usageUsd === null) {
        return {
            success: false,
            error: "Kilo Gateway state API returned invalid currentPeriodUsageUsd",
        };
    }
    if (bonusCreditsUsd === null) {
        return {
            success: false,
            error: "Kilo Gateway state API returned invalid currentPeriodBonusCreditsUsd",
        };
    }
    const resetTimeIso = firstValidResetTimeIso(subscription.nextBillingAt, subscription.nextRenewalAt);
    const totalCreditsUsd = baseCreditsUsd + bonusCreditsUsd;
    const remainingUsd = Math.round(Math.max(0, totalCreditsUsd - usageUsd) * 100) / 100;
    const overageUsd = Math.round(Math.max(0, usageUsd - totalCreditsUsd) * 100) / 100;
    return {
        success: true,
        baseCreditsUsd,
        usageUsd,
        bonusCreditsUsd,
        remainingUsd,
        overageUsd,
        ...(resetTimeIso ? { resetTimeIso } : {}),
    };
}
function parseKiloBalance(payload) {
    if (!isRecord(payload)) {
        return {
            success: false,
            error: "Kilo Gateway balance API returned an unexpected response shape",
        };
    }
    const balanceUsd = nonnegativeNumber(payload.balance);
    if (balanceUsd === null) {
        return {
            success: false,
            error: "Kilo Gateway balance API returned an invalid balance",
        };
    }
    return { success: true, balanceUsd };
}
async function requestKiloPassState(key, options) {
    const query = new URLSearchParams({
        batch: "1",
        input: JSON.stringify({ "0": null }),
    });
    try {
        return await fetchWithTimeout(`${KILO_PASS_STATE_ENDPOINT}?${query.toString()}`, {
            request: {
                method: "GET",
                headers: {
                    Accept: "application/json",
                    Authorization: `Bearer ${key}`,
                    "Content-Type": "application/json",
                },
                redirect: "manual",
            },
            timeoutMs: options.requestTimeoutMs,
            consume: async (response) => {
                const text = await readResponseText(response, "state");
                if (!response.ok) {
                    return {
                        success: false,
                        error: `Kilo Gateway state API error ${response.status}: ${sanitizeMessage(text, key)}`,
                    };
                }
                return parseKiloPassState(JSON.parse(text));
            },
        });
    }
    catch (error) {
        return {
            success: false,
            error: sanitizeMessage(error instanceof Error ? error.message : String(error), key),
        };
    }
}
async function requestKiloBalance(key, options) {
    try {
        return await fetchWithTimeout(KILO_BALANCE_ENDPOINT, {
            request: {
                method: "GET",
                headers: {
                    Accept: "application/json",
                    Authorization: `Bearer ${key}`,
                    "Content-Type": "application/json",
                },
                redirect: "manual",
            },
            timeoutMs: options.requestTimeoutMs,
            consume: async (response) => {
                const text = await readResponseText(response, "balance");
                if (!response.ok) {
                    return {
                        success: false,
                        error: `Kilo Gateway balance API error ${response.status}: ${sanitizeMessage(text, key)}`,
                    };
                }
                return parseKiloBalance(JSON.parse(text));
            },
        });
    }
    catch (error) {
        return {
            success: false,
            error: sanitizeMessage(error instanceof Error ? error.message : String(error), key),
        };
    }
}
export async function queryKiloPassState(options = {}) {
    const resolved = await resolveKiloApiKey();
    if (!resolved)
        return null;
    const result = await requestKiloPassState(resolved.key, options);
    if (isNoActiveKiloPassResult(result)) {
        return { success: false, error: result.error };
    }
    return result;
}
export async function queryKiloQuota(options = {}) {
    const resolved = await resolveKiloApiKey();
    if (!resolved)
        return null;
    const passResult = await requestKiloPassState(resolved.key, options);
    if (passResult.success) {
        return { ...passResult, mode: "kilo_pass" };
    }
    if (!isNoActiveKiloPassResult(passResult)) {
        return passResult;
    }
    const balanceResult = await requestKiloBalance(resolved.key, options);
    if (balanceResult.success) {
        return { ...balanceResult, mode: "gateway_balance" };
    }
    return {
        success: false,
        error: `Kilo Gateway has no active Kilo Pass subscription; balance fallback failed: ${balanceResult.error}`,
    };
}
//# sourceMappingURL=kilo.js.map