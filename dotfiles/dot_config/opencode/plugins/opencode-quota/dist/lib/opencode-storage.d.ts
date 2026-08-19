/**
 * Error thrown when a session is not found.
 *
 * With OpenCode >=1.2, sessions/messages live in SQLite (`opencode.db`).
 * This is thrown by iterAssistantMessagesForSession when the database is
 * missing/unreadable, the session id is invalid, or the session row does
 * not exist.
 */
export declare class SessionNotFoundError extends Error {
    readonly sessionID: string;
    readonly checkedPath: string;
    constructor(sessionID: string, checkedPath: string);
}
export interface OpenCodeTokenCache {
    read: number;
    write: number;
}
export interface OpenCodeTokens {
    input: number;
    output: number;
    reasoning?: number;
    cache: OpenCodeTokenCache;
}
export interface OpenCodeMessage {
    id: string;
    sessionID: string;
    role: "user" | "assistant" | string;
    providerID?: string;
    modelID?: string;
    tokens?: OpenCodeTokens;
    cost?: number;
    time?: {
        created?: number;
        completed?: number;
    };
    agent?: string;
    mode?: string;
}
export interface OpenCodeSessionInfo {
    id: string;
    title?: string;
    parentID?: string;
    time?: {
        created?: number;
        updated?: number;
    };
}
export type OpenCodeDbStats = {
    dbPath: string;
    sessionCount: number;
    messageCount: number;
    assistantMessageCount: number;
};
export declare function getOpenCodeDataDirCandidates(): string[];
export declare function getOpenCodeDataDir(): string;
export declare function getOpenCodeDbPathCandidates(): string[];
export declare function getOpenCodeDbPath(): string;
export declare function getOpenCodeDbStats(): Promise<OpenCodeDbStats>;
export declare function iterAssistantMessages(params: {
    sinceMs?: number;
    untilMs?: number;
}): Promise<OpenCodeMessage[]>;
/**
 * Read authoritative completed assistant/model-loop rows by completion time.
 *
 * This path intentionally does not share the creation-time filters used by token
 * history. A request may be created before a window cutoff and complete inside it.
 */
export declare function iterCompletedAssistantMessages(params: {
    completedSinceMs?: number;
    completedUntilMs?: number;
}): Promise<OpenCodeMessage[]>;
/**
 * Read assistant messages for a specific session only.
 */
export declare function iterAssistantMessagesForSession(params: {
    sessionID: string;
    sinceMs?: number;
    untilMs?: number;
}): Promise<OpenCodeMessage[]>;
/**
 * Read assistant messages for a specific set of sessions.
 */
export declare function iterAssistantMessagesForSessions(params: {
    sessionIDs: string[];
    sinceMs?: number;
    untilMs?: number;
}): Promise<OpenCodeMessage[]>;
export declare function readAllSessionsIndex(): Promise<Record<string, OpenCodeSessionInfo>>;
//# sourceMappingURL=opencode-storage.d.ts.map