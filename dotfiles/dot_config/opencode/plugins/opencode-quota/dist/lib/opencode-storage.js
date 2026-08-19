import { existsSync } from "fs";
import { join } from "path";
import { getOpencodeRuntimeDirCandidates } from "./opencode-runtime-paths.js";
import { openOpenCodeSqliteReadOnly } from "./opencode-sqlite.js";
import { pickFirstExistingPath } from "./path-pick.js";
/**
 * Error thrown when a session is not found.
 *
 * With OpenCode >=1.2, sessions/messages live in SQLite (`opencode.db`).
 * This is thrown by iterAssistantMessagesForSession when the database is
 * missing/unreadable, the session id is invalid, or the session row does
 * not exist.
 */
export class SessionNotFoundError extends Error {
    sessionID;
    checkedPath;
    constructor(sessionID, checkedPath) {
        super(`Session not found: ${sessionID}`);
        this.sessionID = sessionID;
        this.checkedPath = checkedPath;
        this.name = "SessionNotFoundError";
    }
}
export function getOpenCodeDataDirCandidates() {
    // OpenCode stores data under `${Global.Path.data}` which is `join(xdgData, "opencode")`.
    // We return candidate opencode data dirs in priority order.
    return getOpencodeRuntimeDirCandidates().dataDirs;
}
export function getOpenCodeDataDir() {
    return pickFirstExistingPath(getOpenCodeDataDirCandidates());
}
export function getOpenCodeDbPathCandidates() {
    return getOpenCodeDataDirCandidates().map((d) => join(d, "opencode.db"));
}
export function getOpenCodeDbPath() {
    return pickFirstExistingPath(getOpenCodeDbPathCandidates());
}
function asRecord(value) {
    return value && typeof value === "object" ? value : null;
}
function safeJsonParse(raw) {
    try {
        return JSON.parse(raw);
    }
    catch {
        return null;
    }
}
// Stay comfortably below SQLite's default host-parameter cap once optional
// time filters are included in the query.
const SQLITE_MAX_MESSAGE_QUERY_ARGS = 900;
function normalizeNumber(n) {
    return typeof n === "number" && Number.isFinite(n) ? n : undefined;
}
function normalizeString(s) {
    return typeof s === "string" ? s : undefined;
}
function mapRowToOpenCodeMessage(row) {
    if (!row || typeof row !== "object")
        return null;
    if (typeof row.id !== "string" || typeof row.session_id !== "string")
        return null;
    if (typeof row.time_created !== "number")
        return null;
    const payload = asRecord(safeJsonParse(row.data));
    if (!payload)
        return null;
    const payloadTime = asRecord(payload.time);
    const role = normalizeString(payload.role) ?? "unknown";
    return {
        id: row.id,
        sessionID: row.session_id,
        role,
        providerID: normalizeString(payload.providerID),
        modelID: normalizeString(payload.modelID),
        tokens: payload.tokens,
        cost: normalizeNumber(payload.cost),
        time: {
            created: row.time_created,
            completed: normalizeNumber(payloadTime?.completed),
        },
        agent: normalizeString(payload.agent),
        mode: normalizeString(payload.mode),
    };
}
function openDbOrNull() {
    const dbPath = getOpenCodeDbPath();
    if (!dbPath)
        return null;
    if (!existsSync(dbPath))
        return null;
    return {
        dbPath,
        open: () => openOpenCodeSqliteReadOnly(dbPath),
    };
}
function validateSessionIdOrThrow(sessionID) {
    if (!sessionID.startsWith("ses_")) {
        throw new SessionNotFoundError(sessionID, "(invalid session ID format)");
    }
}
function normalizeSessionIdsOrThrow(sessionIDs) {
    const unique = [];
    const seen = new Set();
    for (const sessionID of sessionIDs) {
        validateSessionIdOrThrow(sessionID);
        if (seen.has(sessionID))
            continue;
        seen.add(sessionID);
        unique.push(sessionID);
    }
    return unique;
}
function chunkArray(items, chunkSize) {
    const chunks = [];
    for (let i = 0; i < items.length; i += chunkSize) {
        chunks.push(items.slice(i, i + chunkSize));
    }
    return chunks;
}
function buildMessageQuery(params) {
    if (params.sessionID && params.sessionIDs?.length) {
        throw new Error("buildMessageQuery received both sessionID and sessionIDs");
    }
    const where = [];
    const args = [];
    if (params.sessionID) {
        where.push(`session_id = ?`);
        args.push(params.sessionID);
    }
    else if (params.sessionIDs) {
        if (params.sessionIDs.length === 0) {
            where.push(`1 = 0`);
        }
        else {
            where.push(`session_id IN (${params.sessionIDs.map(() => "?").join(", ")})`);
            args.push(...params.sessionIDs);
        }
    }
    if (typeof params.sinceMs === "number") {
        where.push(`time_created >= ?`);
        args.push(params.sinceMs);
    }
    if (typeof params.untilMs === "number") {
        where.push(`time_created <= ?`);
        args.push(params.untilMs);
    }
    const sql = `SELECT id, session_id, time_created, time_updated, data FROM "message"` +
        (where.length ? ` WHERE ${where.join(" AND ")}` : "") +
        ` ORDER BY time_created ASC, id ASC`;
    return { sql, args };
}
async function hasJsonExtract(conn) {
    try {
        const row = conn.get("SELECT json_extract('{\"role\":\"assistant\"}', '$.role') as r");
        return row?.r === "assistant";
    }
    catch {
        return false;
    }
}
function mapAssistantMessages(rows) {
    const out = [];
    for (const row of rows) {
        const msg = mapRowToOpenCodeMessage(row);
        if (!msg)
            continue;
        if (String(msg.role).toLowerCase() !== "assistant")
            continue;
        out.push(msg);
    }
    return out;
}
function completedAt(message) {
    const value = message.time?.completed;
    return typeof value === "number" && Number.isFinite(value) && value > 0
        ? Math.trunc(value)
        : null;
}
function mapCompletedAssistantMessages(rows) {
    return mapAssistantMessages(rows).filter((message) => completedAt(message) !== null);
}
function compareCompletedMessageOrder(a, b) {
    const aCompleted = completedAt(a) ?? Number.MAX_SAFE_INTEGER;
    const bCompleted = completedAt(b) ?? Number.MAX_SAFE_INTEGER;
    if (aCompleted !== bCompleted)
        return aCompleted - bCompleted;
    return a.id.localeCompare(b.id);
}
function buildCompletedAssistantQuery(params) {
    const completedExpression = `CAST(json_extract(data, '$.time.completed') AS REAL)`;
    const where = [
        `json_extract(data, '$.role') = 'assistant'`,
        `json_type(data, '$.time.completed') IN ('integer', 'real')`,
        `${completedExpression} > 0`,
    ];
    const args = [];
    if (typeof params.completedSinceMs === "number") {
        where.push(`${completedExpression} >= ?`);
        args.push(params.completedSinceMs);
    }
    if (typeof params.completedUntilMs === "number") {
        where.push(`${completedExpression} <= ?`);
        args.push(params.completedUntilMs);
    }
    return {
        sql: `SELECT id, session_id, time_created, time_updated, data FROM "message"` +
            ` WHERE ${where.join(" AND ")}` +
            ` ORDER BY ${completedExpression} ASC, id ASC`,
        args,
    };
}
function compareMessageOrder(a, b) {
    const aCreated = typeof a.time?.created === "number" ? a.time.created : Number.MAX_SAFE_INTEGER;
    const bCreated = typeof b.time?.created === "number" ? b.time.created : Number.MAX_SAFE_INTEGER;
    if (aCreated !== bCreated)
        return aCreated - bCreated;
    return a.id.localeCompare(b.id);
}
export async function getOpenCodeDbStats() {
    const db = openDbOrNull();
    if (!db) {
        return {
            dbPath: getOpenCodeDbPath(),
            sessionCount: 0,
            messageCount: 0,
            assistantMessageCount: 0,
        };
    }
    const conn = await db.open();
    try {
        const sessionRow = conn.get(`SELECT count(*) as c FROM "session"`);
        const messageRow = conn.get(`SELECT count(*) as c FROM "message"`);
        let assistantCount = 0;
        if (await hasJsonExtract(conn)) {
            const a = conn.get(`SELECT count(*) as c FROM "message" WHERE json_extract(data, '$.role') = 'assistant'`);
            assistantCount = typeof a?.c === "number" ? a.c : 0;
        }
        else {
            const rows = conn.all(`SELECT data FROM "message"`);
            for (const r of rows) {
                const payload = asRecord(safeJsonParse(r.data));
                if (payload?.role === "assistant")
                    assistantCount += 1;
            }
        }
        return {
            dbPath: db.dbPath,
            sessionCount: typeof sessionRow?.c === "number" ? sessionRow.c : 0,
            messageCount: typeof messageRow?.c === "number" ? messageRow.c : 0,
            assistantMessageCount: assistantCount,
        };
    }
    finally {
        conn.close();
    }
}
export async function iterAssistantMessages(params) {
    const db = openDbOrNull();
    if (!db)
        return [];
    const conn = await db.open();
    try {
        const q = buildMessageQuery({ sinceMs: params.sinceMs, untilMs: params.untilMs });
        const rows = conn.all(q.sql, q.args);
        return mapAssistantMessages(rows);
    }
    finally {
        conn.close();
    }
}
/**
 * Read authoritative completed assistant/model-loop rows by completion time.
 *
 * This path intentionally does not share the creation-time filters used by token
 * history. A request may be created before a window cutoff and complete inside it.
 */
export async function iterCompletedAssistantMessages(params) {
    const db = openDbOrNull();
    if (!db)
        return [];
    const conn = await db.open();
    try {
        if (await hasJsonExtract(conn)) {
            const query = buildCompletedAssistantQuery(params);
            return mapCompletedAssistantMessages(conn.all(query.sql, query.args));
        }
        const rows = conn.all(`SELECT id, session_id, time_created, time_updated, data FROM "message"`);
        return mapCompletedAssistantMessages(rows)
            .filter((message) => {
            const atMs = completedAt(message);
            if (atMs === null)
                return false;
            if (typeof params.completedSinceMs === "number" && atMs < params.completedSinceMs) {
                return false;
            }
            if (typeof params.completedUntilMs === "number" && atMs > params.completedUntilMs) {
                return false;
            }
            return true;
        })
            .sort(compareCompletedMessageOrder);
    }
    finally {
        conn.close();
    }
}
/**
 * Read assistant messages for a specific session only.
 */
export async function iterAssistantMessagesForSession(params) {
    const { sessionID, sinceMs, untilMs } = params;
    validateSessionIdOrThrow(sessionID);
    const db = openDbOrNull();
    if (!db) {
        throw new SessionNotFoundError(sessionID, getOpenCodeDbPath());
    }
    const conn = await db.open();
    try {
        const exists = conn.get(`SELECT 1 as ok FROM "session" WHERE id = ? LIMIT 1`, [
            sessionID,
        ]);
        if (!exists) {
            throw new SessionNotFoundError(sessionID, db.dbPath);
        }
        const q = buildMessageQuery({ sessionID, sinceMs, untilMs });
        const rows = conn.all(q.sql, q.args);
        return mapAssistantMessages(rows);
    }
    finally {
        conn.close();
    }
}
/**
 * Read assistant messages for a specific set of sessions.
 */
export async function iterAssistantMessagesForSessions(params) {
    const sessionIDs = normalizeSessionIdsOrThrow(params.sessionIDs);
    if (sessionIDs.length === 0)
        return [];
    const db = openDbOrNull();
    if (!db) {
        throw new SessionNotFoundError(sessionIDs[0], getOpenCodeDbPath());
    }
    const conn = await db.open();
    try {
        const reservedArgs = (typeof params.sinceMs === "number" ? 1 : 0) + (typeof params.untilMs === "number" ? 1 : 0);
        const maxSessionIdsPerQuery = Math.max(1, SQLITE_MAX_MESSAGE_QUERY_ARGS - reservedArgs);
        const messages = [];
        for (const sessionIdChunk of chunkArray(sessionIDs, maxSessionIdsPerQuery)) {
            const q = buildMessageQuery({
                sessionIDs: sessionIdChunk,
                sinceMs: params.sinceMs,
                untilMs: params.untilMs,
            });
            const rows = conn.all(q.sql, q.args);
            messages.push(...mapAssistantMessages(rows));
        }
        messages.sort(compareMessageOrder);
        return messages;
    }
    finally {
        conn.close();
    }
}
export async function readAllSessionsIndex() {
    const db = openDbOrNull();
    const idx = {};
    if (!db)
        return idx;
    const conn = await db.open();
    try {
        const rows = conn.all(`SELECT id, title, parent_id, time_created, time_updated FROM "session" ORDER BY time_created ASC, id ASC`);
        for (const row of rows) {
            if (!row || typeof row.id !== "string" || !row.id.startsWith("ses_"))
                continue;
            idx[row.id] = {
                id: row.id,
                title: typeof row.title === "string" && row.title.trim() ? row.title : undefined,
                parentID: typeof row.parent_id === "string" ? row.parent_id : undefined,
                time: {
                    created: typeof row.time_created === "number" ? row.time_created : undefined,
                    updated: typeof row.time_updated === "number" ? row.time_updated : undefined,
                },
            };
        }
        return idx;
    }
    finally {
        conn.close();
    }
}
//# sourceMappingURL=opencode-storage.js.map