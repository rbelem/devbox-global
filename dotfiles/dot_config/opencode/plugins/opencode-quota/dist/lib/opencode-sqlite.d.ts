export interface SqliteConn {
    all<T = unknown>(sql: string, params?: unknown[]): T[];
    get<T = unknown>(sql: string, params?: unknown[]): T | null;
    close(): void;
}
export declare function openOpenCodeSqliteReadOnly(dbPath: string): Promise<SqliteConn>;
//# sourceMappingURL=opencode-sqlite.d.ts.map