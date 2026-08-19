/**
 * Anthropic Claude quota probing.
 *
 * Uses the local Claude CLI/runtime to detect install/auth state first. When
 * Claude auth is confirmed but local quota windows are missing, it falls back
 * to Anthropic's OAuth usage endpoint using the first usable OAuth access
 * token: OpenCode's own auth.json, then Claude OAuth credentials (macOS
 * Keychain first, then the local credentials file).
 */
import { execFile } from "child_process";
import { createHash } from "crypto";
import { readFile } from "fs/promises";
import { homedir } from "os";
import { join } from "path";
import { resolveAnthropicOAuthCached } from "./anthropic-auth.js";
import { sanitizeDisplaySnippet, sanitizeDisplayText } from "./display-sanitize.js";
import { fetchWithTimeout } from "./http.js";
const DEFAULT_CLAUDE_BINARY = "claude";
const CLAUDE_COMMAND_TIMEOUT_MS = 3_000;
const ANTHROPIC_DIAGNOSTICS_TTL_MS = 5_000;
const ANTHROPIC_OAUTH_BACKOFF_BASE_MS = 30_000;
const ANTHROPIC_OAUTH_COOLDOWN_MAX_MS = 15 * 60_000;
const ANTHROPIC_USAGE_URL = "https://api.anthropic.com/api/oauth/usage";
const ANTHROPIC_BETA_HEADER = "oauth-2025-04-20";
const CLAUDE_CODE_CREDENTIALS_SERVICE = "Claude Code-credentials";
const CLAUDE_NO_LOCAL_QUOTA_MESSAGE = "Claude CLI auth detected, but local quota windows were not exposed.";
const ANTHROPIC_NO_QUOTA_MESSAGE = "Claude CLI auth detected, but quota was unavailable from the local CLI and OAuth credential sources.";
const diagnosticsCache = new Map();
const localDiagnosticsCache = new Map();
const anthropicOAuthCooldowns = new Map();
const anthropicOAuthInFlight = new Map();
export function resolveAnthropicBinaryPath(binaryPath) {
    const trimmed = binaryPath?.trim();
    return trimmed ? trimmed : DEFAULT_CLAUDE_BINARY;
}
function formatCommandDisplayArg(value) {
    const sanitized = sanitizeDisplayText(value);
    return /[\s"]/u.test(sanitized) ? JSON.stringify(sanitized) : sanitized;
}
function formatCommandDisplay(parts) {
    return parts.map(formatCommandDisplayArg).join(" ");
}
function quoteWindowsCmdArg(value) {
    const escaped = value.replace(/(\\*)"/g, '$1$1\\"').replace(/(\\+)$/g, "$1$1");
    return `"${escaped}"`;
}
function shouldBridgeClaudeCommandThroughWindowsShell(binaryPath) {
    const normalized = binaryPath.trim().toLowerCase();
    if (!/[\\/]/u.test(normalized)) {
        return true;
    }
    return /\.(?:cmd|bat)$/u.test(normalized);
}
export function buildClaudeCommandInvocation(binaryPath, args, runtime = {}) {
    const resolvedBinaryPath = resolveAnthropicBinaryPath(binaryPath);
    const display = formatCommandDisplay([resolvedBinaryPath, ...args]);
    if ((runtime.platform ?? process.platform) === "win32" &&
        shouldBridgeClaudeCommandThroughWindowsShell(resolvedBinaryPath)) {
        return {
            file: runtime.comspec?.trim() || process.env["ComSpec"]?.trim() || "cmd.exe",
            args: ["/d", "/s", "/c", [resolvedBinaryPath, ...args].map(quoteWindowsCmdArg).join(" ")],
            display,
        };
    }
    return {
        file: resolvedBinaryPath,
        args: [...args],
        display,
    };
}
function asRecord(value) {
    return value && typeof value === "object" && !Array.isArray(value)
        ? value
        : null;
}
function normalizeResetTimeIso(value) {
    if (typeof value !== "string") {
        return undefined;
    }
    const trimmed = value.trim();
    if (!trimmed) {
        return undefined;
    }
    const parsed = Date.parse(trimmed);
    if (!Number.isFinite(parsed)) {
        return undefined;
    }
    return new Date(parsed).toISOString();
}
function normalizeUsagePercent(value) {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }
    if (typeof value === "string") {
        const trimmed = value.trim();
        if (!trimmed) {
            return undefined;
        }
        const parsed = Number(trimmed);
        return Number.isFinite(parsed) ? parsed : undefined;
    }
    return undefined;
}
function getWindowUsedPercent(window) {
    const candidates = [
        window["utilization"],
        window["used_percentage"],
        window["usedPercentage"],
        window["used_percent"],
        window["usedPercent"],
        window["percent_used"],
        window["percentUsed"],
    ];
    for (const candidate of candidates) {
        const normalized = normalizeUsagePercent(candidate);
        if (normalized !== undefined) {
            return normalized;
        }
    }
    return undefined;
}
function getWindowResetTimeIso(window) {
    return normalizeResetTimeIso(window["resets_at"] ?? window["resetsAt"] ?? window["reset_at"] ?? window["resetAt"]);
}
function parseQuotaWindow(window) {
    const record = asRecord(window);
    if (!record) {
        return null;
    }
    const used = getWindowUsedPercent(record);
    if (used === undefined) {
        return null;
    }
    return {
        percentRemaining: Math.min(100, Math.round(100 - used)),
        resetTimeIso: getWindowResetTimeIso(record),
    };
}
function getUsageRoots(data) {
    const root = asRecord(data);
    if (!root) {
        return [];
    }
    const candidates = [
        root,
        asRecord(root["quota"]),
        asRecord(root["usage"]),
        asRecord(root["rate_limits"]),
        asRecord(root["rateLimits"]),
        asRecord(root["oauth_usage"]),
        asRecord(root["oauthUsage"]),
    ];
    const seen = new Set();
    const roots = [];
    for (const candidate of candidates) {
        if (!candidate || seen.has(candidate)) {
            continue;
        }
        seen.add(candidate);
        roots.push(candidate);
    }
    return roots;
}
function parseUsageResponse(data) {
    for (const root of getUsageRoots(data)) {
        const fiveHour = parseQuotaWindow(root["five_hour"] ?? root["fiveHour"]);
        const sevenDay = parseQuotaWindow(root["seven_day"] ?? root["sevenDay"]);
        if (!fiveHour || !sevenDay) {
            continue;
        }
        return {
            success: true,
            five_hour: fiveHour,
            seven_day: sevenDay,
        };
    }
    return null;
}
function getClaudeCredentialsPath() {
    return join(homedir(), ".claude", ".credentials.json");
}
function getClaudeKeychainLocation() {
    return `macOS Keychain service ${sanitizeDisplayText(CLAUDE_CODE_CREDENTIALS_SERVICE)}`;
}
function getClaudeCredentialsNotFoundDetail(locations) {
    if (locations.length === 0) {
        return "Claude OAuth credentials were not found.";
    }
    if (locations.length === 1) {
        return `Claude OAuth credentials not found in ${locations[0]}.`;
    }
    const [head, ...tail] = locations;
    return `Claude OAuth credentials not found in ${head} or ${tail.join(" or ")}.`;
}
function buildAnthropicNoQuotaDiagnosticsMessage(detail) {
    const normalizedDetail = detail?.trim();
    return normalizedDetail
        ? `${ANTHROPIC_NO_QUOTA_MESSAGE} ${normalizedDetail}`
        : ANTHROPIC_NO_QUOTA_MESSAGE;
}
function extractClaudeCredentialsAccessToken(data) {
    const root = asRecord(data);
    if (!root) {
        return "";
    }
    for (const candidate of [asRecord(root["claudeAiOauth"]), asRecord(root["oauth"]), root]) {
        if (!candidate) {
            continue;
        }
        for (const key of ["accessToken", "access_token", "token"]) {
            const token = candidate[key];
            if (typeof token === "string" && token.trim()) {
                return token.trim();
            }
        }
    }
    return "";
}
function parseClaudeCredentialsAccessToken(content, options) {
    const trimmed = content.trim();
    if (!trimmed) {
        return { error: "missing" };
    }
    if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
        return options.allowPlainText ? { accessToken: trimmed } : { error: "missing" };
    }
    try {
        const parsed = JSON.parse(trimmed);
        const accessToken = extractClaudeCredentialsAccessToken(parsed);
        return accessToken ? { accessToken } : { error: "missing" };
    }
    catch (error) {
        return {
            error: sanitizeDisplayText(error instanceof Error ? error.message : String(error)),
        };
    }
}
async function runCredentialCommand(file, args) {
    return await new Promise((resolve, reject) => {
        try {
            execFile(file, args, {
                encoding: "utf8",
                timeout: CLAUDE_COMMAND_TIMEOUT_MS,
                maxBuffer: 1024 * 1024,
            }, (error, stdout, stderr) => {
                const stdoutText = typeof stdout === "string" ? stdout : stdout.toString("utf8");
                const stderrText = typeof stderr === "string" ? stderr : stderr.toString("utf8");
                if (!error) {
                    resolve({
                        code: 0,
                        stdout: stdoutText,
                        stderr: stderrText,
                        timedOut: false,
                    });
                    return;
                }
                const execError = error;
                resolve({
                    code: typeof execError.code === "number" ? execError.code : null,
                    stdout: stdoutText,
                    stderr: stderrText,
                    timedOut: isTimedOutError(execError),
                    spawnErrorCode: execError.code,
                    errorMessage: execError.message,
                });
            });
        }
        catch (error) {
            reject(error);
        }
    });
}
async function readClaudeCredentialsAccessTokenFromMacOSKeychain() {
    if (process.platform !== "darwin") {
        return null;
    }
    const location = getClaudeKeychainLocation();
    const result = await runCredentialCommand("security", [
        "find-generic-password",
        "-s",
        CLAUDE_CODE_CREDENTIALS_SERVICE,
        "-w",
    ]);
    if (result.code !== 0) {
        return {
            state: "not-found",
            location,
        };
    }
    const parsed = parseClaudeCredentialsAccessToken(result.stdout, { allowPlainText: true });
    if (parsed.accessToken) {
        return {
            state: "configured",
            accessToken: parsed.accessToken,
        };
    }
    return {
        state: "unavailable",
        detail: parsed.error && parsed.error !== "missing"
            ? `Could not parse Claude OAuth credentials from ${location}: ${parsed.error}.`
            : `Claude OAuth access token missing in ${location}.`,
    };
}
async function readClaudeCredentialsAccessTokenFromFile() {
    const credentialsPath = getClaudeCredentialsPath();
    try {
        const content = await readFile(credentialsPath, "utf8");
        const parsed = parseClaudeCredentialsAccessToken(content, { allowPlainText: false });
        const accessToken = parsed.accessToken?.trim() ?? "";
        if (!accessToken) {
            return {
                state: "unavailable",
                detail: parsed.error && parsed.error !== "missing"
                    ? `Could not parse Claude credentials file ${sanitizeDisplayText(credentialsPath)}: ${parsed.error}.`
                    : `Claude OAuth access token missing in ${sanitizeDisplayText(credentialsPath)}.`,
            };
        }
        return {
            state: "configured",
            accessToken,
        };
    }
    catch (error) {
        const code = error && typeof error === "object" && "code" in error
            ? error.code
            : undefined;
        if (code === "ENOENT") {
            return {
                state: "not-found",
                location: sanitizeDisplayText(credentialsPath),
            };
        }
        return {
            state: "unavailable",
            detail: `Could not read Claude credentials file: ${sanitizeDisplayText(error instanceof Error ? error.message : String(error))}`,
        };
    }
}
async function readAnthropicOAuthAccessToken(options) {
    const locationsChecked = [];
    const unavailableDetails = [];
    const opencodeCredentials = await resolveAnthropicOAuthCached();
    if (opencodeCredentials.state === "configured") {
        return {
            state: "configured",
            accessToken: opencodeCredentials.accessToken,
            source: "opencode-auth",
        };
    }
    if (!options.includeClaudeCredentials) {
        return { state: "unavailable" };
    }
    const keychainCredentials = await readClaudeCredentialsAccessTokenFromMacOSKeychain();
    if (keychainCredentials?.state === "configured") {
        return { ...keychainCredentials, source: "claude-credentials" };
    }
    if (keychainCredentials?.state === "unavailable") {
        unavailableDetails.push(keychainCredentials.detail);
    }
    if (keychainCredentials?.state === "not-found") {
        locationsChecked.push(keychainCredentials.location);
    }
    const fileCredentials = await readClaudeCredentialsAccessTokenFromFile();
    if (fileCredentials.state === "configured") {
        return { ...fileCredentials, source: "claude-credentials" };
    }
    if (fileCredentials.state === "unavailable") {
        unavailableDetails.push(fileCredentials.detail);
    }
    if (fileCredentials.state === "not-found") {
        locationsChecked.push(fileCredentials.location);
    }
    return {
        state: "unavailable",
        detail: unavailableDetails[0] ?? getClaudeCredentialsNotFoundDetail(locationsChecked),
    };
}
function fingerprintAccessToken(accessToken) {
    return createHash("sha256").update(accessToken).digest("hex");
}
function parseRetryAfterMs(value, nowMs) {
    const trimmed = value?.trim();
    if (!trimmed) {
        return undefined;
    }
    if (/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/u.test(trimmed)) {
        const seconds = Number(trimmed);
        return Number.isFinite(seconds) && seconds > 0 ? seconds * 1_000 : undefined;
    }
    const retryAtMs = Date.parse(trimmed);
    const durationMs = retryAtMs - nowMs;
    return Number.isFinite(durationMs) && durationMs > 0 ? durationMs : undefined;
}
function getAnthropicOAuthCooldownDurationMs(failureCount, retryAfter, nowMs) {
    const exponentialMs = Math.min(ANTHROPIC_OAUTH_COOLDOWN_MAX_MS, ANTHROPIC_OAUTH_BACKOFF_BASE_MS * 2 ** Math.min(failureCount, 30));
    const retryAfterMs = Math.min(ANTHROPIC_OAUTH_COOLDOWN_MAX_MS, parseRetryAfterMs(retryAfter, nowMs) ?? 0);
    return Math.max(exponentialMs, retryAfterMs);
}
function getAnthropicOAuthCooldownMessage(remainingMs) {
    const boundedRemainingMs = Math.min(ANTHROPIC_OAUTH_COOLDOWN_MAX_MS, Math.max(0, remainingMs));
    return `Anthropic OAuth usage probe paused after HTTP 429; retry in ${Math.ceil(boundedRemainingMs / 1_000)}s.`;
}
function retainAnthropicOAuthCooldownForToken(tokenFingerprint) {
    for (const fingerprint of anthropicOAuthCooldowns.keys()) {
        if (fingerprint !== tokenFingerprint) {
            anthropicOAuthCooldowns.delete(fingerprint);
        }
    }
}
function redactAccessTokenFromSanitizedDetail(detail, accessToken) {
    const sanitizedDetail = sanitizeDisplayText(detail);
    const sanitizedAccessToken = sanitizeDisplayText(accessToken);
    const redactedDetail = sanitizedDetail.split(accessToken).join("[redacted]");
    return sanitizedAccessToken
        ? redactedDetail.split(sanitizedAccessToken).join("[redacted]")
        : redactedDetail;
}
function sanitizeAnthropicApiDetail(detail, accessToken) {
    return redactAccessTokenFromSanitizedDetail(detail, accessToken).slice(0, 120);
}
function sanitizeAnthropicRequestError(detail, accessToken) {
    return redactAccessTokenFromSanitizedDetail(detail, accessToken);
}
async function performAnthropicOAuthUsageRequest(accessToken, tokenFingerprint, requestTimeoutMs) {
    try {
        return await fetchWithTimeout(ANTHROPIC_USAGE_URL, {
            request: {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "anthropic-beta": ANTHROPIC_BETA_HEADER,
                },
            },
            timeoutMs: requestTimeoutMs,
            consume: async (response, timeoutSignal) => {
                if (response.status === 429) {
                    const nowMs = Date.now();
                    const previousFailureCount = anthropicOAuthCooldowns.get(tokenFingerprint)?.failureCount ?? 0;
                    const durationMs = getAnthropicOAuthCooldownDurationMs(previousFailureCount, response.headers?.get?.("Retry-After") ?? null, nowMs);
                    anthropicOAuthCooldowns.set(tokenFingerprint, {
                        failureCount: previousFailureCount + 1,
                        blockedUntilMs: nowMs + durationMs,
                    });
                    let detail = "";
                    try {
                        detail = sanitizeAnthropicApiDetail(await response.text(), accessToken);
                    }
                    catch (error) {
                        if (timeoutSignal.aborted)
                            throw error;
                        detail = "";
                    }
                    const errorDetail = detail
                        ? `Anthropic API error ${response.status}: ${detail}`
                        : `Anthropic API returned ${response.status}`;
                    return {
                        state: "unavailable",
                        detail: `${errorDetail} ${getAnthropicOAuthCooldownMessage(durationMs)}`,
                    };
                }
                anthropicOAuthCooldowns.delete(tokenFingerprint);
                if (!response.ok) {
                    let detail = "";
                    try {
                        detail = sanitizeAnthropicApiDetail(await response.text(), accessToken);
                    }
                    catch (error) {
                        if (timeoutSignal.aborted)
                            throw error;
                        detail = "";
                    }
                    return {
                        state: "unavailable",
                        detail: detail
                            ? `Anthropic API error ${response.status}: ${detail}`
                            : `Anthropic API returned ${response.status}`,
                    };
                }
                let data;
                try {
                    data = await response.json();
                }
                catch (error) {
                    if (timeoutSignal.aborted)
                        throw error;
                    return {
                        state: "unavailable",
                        detail: "Failed to parse Anthropic quota response",
                    };
                }
                const quota = parseUsageResponse(data);
                if (!quota) {
                    return {
                        state: "unavailable",
                        detail: "Unexpected Anthropic quota response shape",
                    };
                }
                return {
                    state: "success",
                    quota,
                };
            },
        });
    }
    catch (error) {
        return {
            state: "unavailable",
            detail: sanitizeAnthropicRequestError(error instanceof Error ? error.message : String(error), accessToken),
        };
    }
}
async function queryAnthropicQuotaFromOAuthAccessToken(accessToken, requestTimeoutMs) {
    const tokenFingerprint = fingerprintAccessToken(accessToken);
    retainAnthropicOAuthCooldownForToken(tokenFingerprint);
    const nowMs = Date.now();
    const cooldown = anthropicOAuthCooldowns.get(tokenFingerprint);
    if (cooldown && cooldown.blockedUntilMs > nowMs) {
        return {
            state: "unavailable",
            detail: getAnthropicOAuthCooldownMessage(cooldown.blockedUntilMs - nowMs),
        };
    }
    const existingInFlight = anthropicOAuthInFlight.get(tokenFingerprint);
    if (existingInFlight) {
        return await existingInFlight;
    }
    const inFlight = performAnthropicOAuthUsageRequest(accessToken, tokenFingerprint, requestTimeoutMs);
    anthropicOAuthInFlight.set(tokenFingerprint, inFlight);
    try {
        return await inFlight;
    }
    finally {
        if (anthropicOAuthInFlight.get(tokenFingerprint) === inFlight) {
            anthropicOAuthInFlight.delete(tokenFingerprint);
        }
    }
}
function extractAuthBoolean(data) {
    const record = asRecord(data);
    if (!record) {
        return undefined;
    }
    for (const candidate of [
        record["authenticated"],
        record["isAuthenticated"],
        record["loggedIn"],
    ]) {
        if (typeof candidate === "boolean") {
            return candidate;
        }
    }
    const authRecord = asRecord(record["auth"]);
    if (authRecord) {
        for (const candidate of [authRecord["authenticated"], authRecord["loggedIn"]]) {
            if (typeof candidate === "boolean") {
                return candidate;
            }
        }
    }
    const status = record["status"];
    if (typeof status === "string") {
        const normalized = status.trim().toLowerCase();
        if (normalized === "authenticated") {
            return true;
        }
        if (normalized === "unauthenticated") {
            return false;
        }
    }
    return undefined;
}
function hasUnsupportedCommandText(output) {
    const normalized = output.toLowerCase();
    return (normalized.includes("unknown command") ||
        normalized.includes("unrecognized command") ||
        normalized.includes("unexpected argument"));
}
function hasUnauthenticatedText(output) {
    const normalized = output.toLowerCase();
    return (normalized.includes("not logged in") ||
        normalized.includes("login required") ||
        normalized.includes("authentication required") ||
        normalized.includes("run `claude login`") ||
        normalized.includes("run `claude auth login`") ||
        normalized.includes("run claude login") ||
        normalized.includes("run claude auth login"));
}
function detailFromCommandResult(result) {
    const detail = `${result.stderr}\n${result.stdout}\n${result.errorMessage ?? ""}`.trim();
    return detail ? sanitizeDisplaySnippet(detail, 160) : undefined;
}
function parseVersion(output) {
    const match = output.match(/\b\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?\b/);
    return match ? match[0] : null;
}
function isCommandMissing(result) {
    if (result.spawnErrorCode === "ENOENT") {
        return true;
    }
    const output = `${result.stderr}\n${result.stdout}\n${result.errorMessage ?? ""}`.toLowerCase();
    return (output.includes("command not found") ||
        output.includes("not recognized as an internal or external command") ||
        output.includes("no such file or directory"));
}
function isTimedOutError(error) {
    return (error.code === "ETIMEDOUT" ||
        error.killed === true ||
        error.message.toLowerCase().includes("timed out"));
}
async function runClaudeCommand(invocation) {
    return await new Promise((resolve, reject) => {
        try {
            execFile(invocation.file, invocation.args, {
                encoding: "utf8",
                timeout: CLAUDE_COMMAND_TIMEOUT_MS,
                maxBuffer: 1024 * 1024,
            }, (error, stdout, stderr) => {
                const stdoutText = typeof stdout === "string" ? stdout : stdout.toString("utf8");
                const stderrText = typeof stderr === "string" ? stderr : stderr.toString("utf8");
                if (!error) {
                    resolve({
                        code: 0,
                        stdout: stdoutText,
                        stderr: stderrText,
                        timedOut: false,
                    });
                    return;
                }
                const execError = error;
                resolve({
                    code: typeof execError.code === "number" ? execError.code : null,
                    stdout: stdoutText,
                    stderr: stderrText,
                    timedOut: isTimedOutError(execError),
                    spawnErrorCode: execError.code,
                    errorMessage: execError.message,
                });
            });
        }
        catch (error) {
            reject(error);
        }
    });
}
function parseClaudeAuthStatusResult(result) {
    const combinedOutput = `${result.stdout}\n${result.stderr}`;
    if (hasUnsupportedCommandText(combinedOutput)) {
        return {
            authStatus: "unknown",
            unsupportedCommand: true,
            message: "Claude CLI authentication status JSON is unavailable in this version of Claude.",
        };
    }
    if (hasUnauthenticatedText(combinedOutput)) {
        return {
            authStatus: "unauthenticated",
            message: "Claude is not authenticated. Run `claude auth login` and try again.",
        };
    }
    const trimmed = result.stdout.trim();
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
        try {
            const payload = JSON.parse(trimmed);
            const auth = extractAuthBoolean(payload);
            if (auth === true) {
                return {
                    authStatus: "authenticated",
                    jsonPayload: payload,
                };
            }
            if (auth === false) {
                return {
                    authStatus: "unauthenticated",
                    message: "Claude is not authenticated. Run `claude auth login` and try again.",
                    jsonPayload: payload,
                };
            }
            return {
                authStatus: "unknown",
                message: "Could not verify Claude authentication status from JSON output.",
                jsonPayload: payload,
            };
        }
        catch {
            // Fall through to exit-code-based handling.
        }
    }
    if (result.code === 0) {
        return { authStatus: "authenticated" };
    }
    if (result.timedOut) {
        return {
            authStatus: "unknown",
            message: "Timed out while running Claude CLI auth status.",
        };
    }
    const detail = detailFromCommandResult(result);
    return {
        authStatus: "unknown",
        message: detail
            ? `Could not verify Claude authentication status. ${detail}`
            : "Could not verify Claude authentication status.",
    };
}
function mapLocalDiagnosticsToAnthropicDiagnostics(localDiagnostics) {
    if (localDiagnostics.localQuota) {
        return {
            installed: localDiagnostics.installed,
            version: localDiagnostics.version,
            authStatus: localDiagnostics.authStatus,
            quotaSupported: true,
            quotaSource: "claude-auth-status-json",
            checkedCommands: localDiagnostics.checkedCommands,
            quota: localDiagnostics.localQuota,
        };
    }
    const diagnostics = {
        installed: localDiagnostics.installed,
        version: localDiagnostics.version,
        authStatus: localDiagnostics.authStatus,
        quotaSupported: false,
        quotaSource: "none",
        checkedCommands: localDiagnostics.checkedCommands,
    };
    if (localDiagnostics.message) {
        diagnostics.message = localDiagnostics.message;
    }
    return diagnostics;
}
async function probeAnthropicLocalDiagnostics(options = {}) {
    const binaryPath = resolveAnthropicBinaryPath(options.binaryPath);
    const checkedCommands = [];
    const versionCommand = buildClaudeCommandInvocation(binaryPath, ["--version"]);
    checkedCommands.push(versionCommand.display);
    const versionResult = await runClaudeCommand(versionCommand);
    if (isCommandMissing(versionResult)) {
        return {
            installed: false,
            version: null,
            authStatus: "unknown",
            checkedCommands,
            message: `Claude CLI (\`${sanitizeDisplayText(binaryPath)}\`) is not installed or not on PATH.`,
        };
    }
    const version = parseVersion(`${versionResult.stdout}\n${versionResult.stderr}`);
    const authStatusJsonCommand = buildClaudeCommandInvocation(binaryPath, [
        "auth",
        "status",
        "--json",
    ]);
    checkedCommands.push(authStatusJsonCommand.display);
    const authJsonResult = await runClaudeCommand(authStatusJsonCommand);
    let parsedAuth = parseClaudeAuthStatusResult(authJsonResult);
    if (parsedAuth.unsupportedCommand) {
        const authStatusCommand = buildClaudeCommandInvocation(binaryPath, ["auth", "status"]);
        checkedCommands.push(authStatusCommand.display);
        parsedAuth = parseClaudeAuthStatusResult(await runClaudeCommand(authStatusCommand));
    }
    if (parsedAuth.authStatus !== "authenticated") {
        return {
            installed: true,
            version,
            authStatus: parsedAuth.authStatus,
            checkedCommands,
            message: parsedAuth.message,
        };
    }
    const quota = parsedAuth.jsonPayload ? parseUsageResponse(parsedAuth.jsonPayload) : null;
    if (quota) {
        return {
            installed: true,
            version,
            authStatus: "authenticated",
            checkedCommands,
            localQuota: quota,
        };
    }
    return {
        installed: true,
        version,
        authStatus: "authenticated",
        checkedCommands,
        message: CLAUDE_NO_LOCAL_QUOTA_MESSAGE,
    };
}
export function clearAnthropicDiagnosticsCacheForTests() {
    diagnosticsCache.clear();
    localDiagnosticsCache.clear();
    anthropicOAuthCooldowns.clear();
    anthropicOAuthInFlight.clear();
}
async function getCachedAnthropicLocalDiagnostics(options = {}) {
    const binaryPath = resolveAnthropicBinaryPath(options.binaryPath);
    const now = Date.now();
    const cached = localDiagnosticsCache.get(binaryPath) ?? {
        timestamp: 0,
        value: null,
    };
    if (cached.value &&
        cached.timestamp > 0 &&
        now - cached.timestamp < ANTHROPIC_DIAGNOSTICS_TTL_MS) {
        return cached.value;
    }
    if (cached.inFlight) {
        return cached.inFlight;
    }
    const inFlight = probeAnthropicLocalDiagnostics({ binaryPath }).then((value) => {
        localDiagnosticsCache.set(binaryPath, {
            timestamp: Date.now(),
            value,
        });
        return value;
    });
    localDiagnosticsCache.set(binaryPath, {
        timestamp: cached.timestamp,
        value: cached.value,
        inFlight,
    });
    try {
        return await inFlight;
    }
    finally {
        const latest = localDiagnosticsCache.get(binaryPath);
        if (latest?.inFlight === inFlight) {
            localDiagnosticsCache.set(binaryPath, {
                timestamp: latest.timestamp,
                value: latest.value,
            });
        }
    }
}
export async function getAnthropicDiagnostics(options = {}) {
    const binaryPath = resolveAnthropicBinaryPath(options.binaryPath);
    const now = Date.now();
    const cached = diagnosticsCache.get(binaryPath) ?? {
        timestamp: 0,
        value: null,
    };
    if (cached.value &&
        cached.timestamp > 0 &&
        now - cached.timestamp < ANTHROPIC_DIAGNOSTICS_TTL_MS) {
        return cached.value;
    }
    if (cached.inFlight) {
        return cached.inFlight;
    }
    const inFlight = (async () => {
        const localDiagnostics = await getCachedAnthropicLocalDiagnostics({ binaryPath });
        if (localDiagnostics.localQuota) {
            return mapLocalDiagnosticsToAnthropicDiagnostics(localDiagnostics);
        }
        const credentials = await readAnthropicOAuthAccessToken({
            includeClaudeCredentials: localDiagnostics.authStatus === "authenticated",
        });
        if (credentials.state !== "configured") {
            if (localDiagnostics.authStatus !== "authenticated") {
                return mapLocalDiagnosticsToAnthropicDiagnostics(localDiagnostics);
            }
            const diagnostics = {
                installed: localDiagnostics.installed,
                version: localDiagnostics.version,
                authStatus: localDiagnostics.authStatus,
                quotaSupported: false,
                quotaSource: "none",
                checkedCommands: localDiagnostics.checkedCommands,
                message: buildAnthropicNoQuotaDiagnosticsMessage(credentials.detail),
            };
            return diagnostics;
        }
        const fallbackQuota = await queryAnthropicQuotaFromOAuthAccessToken(credentials.accessToken, options.requestTimeoutMs);
        if (fallbackQuota.state !== "success") {
            const diagnostics = {
                installed: localDiagnostics.installed,
                version: localDiagnostics.version,
                authStatus: localDiagnostics.authStatus,
                quotaSupported: false,
                quotaSource: "none",
                oauthCredentialSource: credentials.source,
                checkedCommands: localDiagnostics.checkedCommands,
                message: buildAnthropicNoQuotaDiagnosticsMessage(fallbackQuota.detail),
            };
            return diagnostics;
        }
        const diagnostics = {
            installed: localDiagnostics.installed,
            version: localDiagnostics.version,
            authStatus: localDiagnostics.authStatus,
            quotaSupported: true,
            quotaSource: credentials.source === "opencode-auth"
                ? "opencode-auth-oauth-api"
                : "claude-credentials-oauth-api",
            oauthCredentialSource: credentials.source,
            checkedCommands: localDiagnostics.checkedCommands,
            quota: fallbackQuota.quota,
        };
        return diagnostics;
    })().then((value) => {
        diagnosticsCache.set(binaryPath, {
            timestamp: Date.now(),
            value,
        });
        return value;
    });
    diagnosticsCache.set(binaryPath, {
        timestamp: cached.timestamp,
        value: cached.value,
        inFlight,
    });
    try {
        return await inFlight;
    }
    finally {
        const latest = diagnosticsCache.get(binaryPath);
        if (latest?.inFlight === inFlight) {
            diagnosticsCache.set(binaryPath, {
                timestamp: latest.timestamp,
                value: latest.value,
            });
        }
    }
}
export async function hasAnthropicCredentialsConfigured(options = {}) {
    try {
        const opencodeCredentials = await resolveAnthropicOAuthCached();
        if (opencodeCredentials.state === "configured") {
            return true;
        }
    }
    catch {
        // Fall back to the existing local Claude CLI probe.
    }
    try {
        const diagnostics = await getCachedAnthropicLocalDiagnostics(options);
        return diagnostics.installed && diagnostics.authStatus === "authenticated";
    }
    catch {
        return false;
    }
}
export async function queryAnthropicQuota(options = {}) {
    try {
        const diagnostics = await getAnthropicDiagnostics(options);
        if (diagnostics.quotaSupported) {
            return diagnostics.quota ?? null;
        }
        if (diagnostics.authStatus === "authenticated" && diagnostics.message) {
            return {
                success: false,
                error: diagnostics.message,
            };
        }
        return null;
    }
    catch (err) {
        return {
            success: false,
            error: `Claude CLI probe failed: ${sanitizeDisplayText(err instanceof Error ? err.message : String(err))}`,
        };
    }
}
export { parseUsageResponse };
//# sourceMappingURL=anthropic.js.map