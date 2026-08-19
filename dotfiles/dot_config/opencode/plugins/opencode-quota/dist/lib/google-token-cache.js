/**
 * Persistent access-token cache for Google Antigravity accounts.
 *
 * Why:
 * - Antigravity quota is multi-account; each account needs its own access token.
 * - Refreshing on every toast is noisy and increases timeout risk.
 * - We persist access tokens so restarts don't force immediate refresh.
 */
import { createHash } from "crypto";
import { readFile } from "fs/promises";
import { join } from "path";
import { writeTextAtomic } from "./atomic-json.js";
import { getOpencodeRuntimeDirs } from "./opencode-runtime-paths.js";
const CACHE_VERSION = 1;
let memCache = null;
let loadPromise = null;
let operationQueue = Promise.resolve();
function getCacheBaseDir() {
    // Match OpenCode runtime cache semantics (xdg-basedir).
    // This avoids mismatches on Windows where OpenCode cache is not under LOCALAPPDATA.
    return getOpencodeRuntimeDirs().cacheDir;
}
export function getGoogleTokenCachePath() {
    return join(getCacheBaseDir(), "opencode-quota", "google-access-tokens.json");
}
export function makeAccountCacheKey(params) {
    const emailPart = (params.email ?? "").trim().toLowerCase();
    const hash = createHash("sha256")
        .update(params.refreshToken)
        .update("\n")
        .update(params.projectId)
        .digest("hex")
        .slice(0, 16);
    // Keep a human hint without making it sensitive.
    return `${emailPart}::${params.projectId}::${hash}`;
}
function enqueue(operation) {
    const result = operationQueue.then(operation, operation);
    operationQueue = result.then(() => undefined, () => undefined);
    return result;
}
function cloneCache(cache) {
    return {
        version: CACHE_VERSION,
        updatedAt: cache.updatedAt,
        tokens: Object.fromEntries(Object.entries(cache.tokens).map(([key, entry]) => [key, { ...entry }])),
    };
}
function asRecord(value) {
    return value && typeof value === "object" && !Array.isArray(value)
        ? value
        : null;
}
function parseCacheEntry(value) {
    const entry = asRecord(value);
    if (!entry)
        return null;
    if (typeof entry.accessToken !== "string" || !entry.accessToken.trim())
        return null;
    if (typeof entry.projectId !== "string" || !entry.projectId.trim())
        return null;
    if (typeof entry.expiresAt !== "number" || !Number.isFinite(entry.expiresAt))
        return null;
    if (entry.email !== undefined && typeof entry.email !== "string")
        return null;
    return {
        accessToken: entry.accessToken,
        expiresAt: entry.expiresAt,
        projectId: entry.projectId,
        ...(entry.email === undefined ? {} : { email: entry.email }),
    };
}
async function loadFromDisk(path) {
    try {
        const raw = await readFile(path, "utf-8");
        const file = asRecord(JSON.parse(raw));
        const tokenValues = asRecord(file?.tokens);
        if (file?.version !== CACHE_VERSION || !tokenValues) {
            throw new Error("invalid");
        }
        const tokens = {};
        for (const [key, value] of Object.entries(tokenValues)) {
            const entry = parseCacheEntry(value);
            if (entry)
                tokens[key] = entry;
        }
        return {
            version: CACHE_VERSION,
            updatedAt: typeof file.updatedAt === "number" ? file.updatedAt : Date.now(),
            tokens,
        };
    }
    catch {
        return { version: CACHE_VERSION, updatedAt: Date.now(), tokens: {} };
    }
}
async function ensureLoaded() {
    if (memCache)
        return memCache;
    if (loadPromise)
        return loadPromise;
    const path = getGoogleTokenCachePath();
    loadPromise = loadFromDisk(path).then((file) => {
        memCache = file;
        loadPromise = null;
        return file;
    });
    return loadPromise;
}
async function persist(cache) {
    await writeTextAtomic(getGoogleTokenCachePath(), JSON.stringify(cache, null, 2), {
        directoryMode: 0o700,
        fileMode: 0o600,
    });
}
export async function getCachedAccessToken(params) {
    return enqueue(async () => {
        const cache = await ensureLoaded();
        const entry = cache.tokens[params.key];
        if (!entry)
            return null;
        if (typeof entry.expiresAt !== "number")
            return null;
        if (entry.expiresAt <= Date.now() + params.skewMs)
            return null;
        return entry;
    });
}
export async function setCachedAccessToken(params) {
    return enqueue(async () => {
        const current = await ensureLoaded();
        const next = cloneCache(current);
        next.tokens[params.key] = { ...params.entry };
        next.updatedAt = Date.now();
        await persist(next);
        memCache = next;
    });
}
export async function clearGoogleTokenCache() {
    return enqueue(async () => {
        await ensureLoaded();
        const next = {
            version: CACHE_VERSION,
            updatedAt: Date.now(),
            tokens: {},
        };
        await persist(next);
        memCache = next;
    });
}
//# sourceMappingURL=google-token-cache.js.map