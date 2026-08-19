function toParams(params) {
    return Array.isArray(params) ? params : [];
}
function runBunPragma(db, sql) {
    try {
        db.query(sql).run();
    }
    catch {
        // ignore
    }
}
function runPreparedPragma(db, sql) {
    try {
        db.prepare(sql).run();
    }
    catch {
        // ignore
    }
}
function runNodePragma(db, sql) {
    try {
        db.exec(sql);
    }
    catch {
        // ignore
    }
}
function createPreparedSqliteConn(db) {
    return {
        all(sql, params) {
            const stmt = db.prepare(sql);
            return stmt.all(...toParams(params));
        },
        get(sql, params) {
            const stmt = db.prepare(sql);
            const row = stmt.get(...toParams(params));
            return row ?? null;
        },
        close() {
            try {
                db.close();
            }
            catch {
                // ignore
            }
        },
    };
}
async function openWithBunSqlite(dbPath) {
    const mod = (await import("bun:sqlite"));
    const db = new mod.Database(dbPath, { readonly: true });
    // Keep reads deterministic and avoid accidental writes.
    runBunPragma(db, "PRAGMA query_only = ON;");
    // Avoid transient SQLITE_BUSY errors (WAL).
    runBunPragma(db, "PRAGMA busy_timeout = 5000;");
    return {
        all(sql, params) {
            const stmt = db.query(sql);
            return stmt.all(...toParams(params));
        },
        get(sql, params) {
            const stmt = db.query(sql);
            const row = stmt.get(...toParams(params));
            return row ?? null;
        },
        close() {
            try {
                db.close();
            }
            catch {
                // ignore
            }
        },
    };
}
async function importNodeSqlite() {
    try {
        return (await import("node:sqlite"));
    }
    catch {
        return null;
    }
}
async function openWithNodeSqlite(dbPath, mod) {
    const db = new mod.DatabaseSync(dbPath, {
        readOnly: true,
        enableForeignKeyConstraints: true,
        open: true,
    });
    // Keep reads deterministic and avoid accidental writes.
    runNodePragma(db, "PRAGMA query_only = ON;");
    // Avoid transient SQLITE_BUSY errors (WAL).
    runNodePragma(db, "PRAGMA busy_timeout = 5000;");
    return createPreparedSqliteConn(db);
}
async function openWithBetterSqlite3(dbPath) {
    const mod = (await import("better-sqlite3"));
    const db = new mod.default(dbPath, { readonly: true });
    // Keep reads deterministic and avoid accidental writes.
    runPreparedPragma(db, "PRAGMA query_only = ON;");
    // Avoid transient SQLITE_BUSY errors (WAL).
    runPreparedPragma(db, "PRAGMA busy_timeout = 5000;");
    return createPreparedSqliteConn(db);
}
async function openWithNodeRuntimeSqlite(dbPath) {
    const nodeSqlite = await importNodeSqlite();
    if (nodeSqlite) {
        return openWithNodeSqlite(dbPath, nodeSqlite);
    }
    try {
        return await openWithBetterSqlite3(dbPath);
    }
    catch (cause) {
        throw new Error("OpenCode SQLite backend unavailable in this Node runtime; node:sqlite or optional better-sqlite3 is required for local history reads.", { cause });
    }
}
export async function openOpenCodeSqliteReadOnly(dbPath) {
    if (typeof globalThis === "object" && "Bun" in globalThis) {
        return openWithBunSqlite(dbPath);
    }
    return openWithNodeRuntimeSqlite(dbPath);
}
//# sourceMappingURL=opencode-sqlite.js.map