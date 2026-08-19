export declare const QUOTA_PACKAGE_NAME = "@slkiser/opencode-quota";
export declare const QUOTA_LATEST_SPEC = "@slkiser/opencode-quota@latest";
export interface ScopedUpdateConfigEdit {
    path: string;
    original: string;
    originalBytes: Buffer;
    updated: string;
    replacements: number;
}
export interface ScopedUpdateConfigSnapshot {
    path: string;
    originalBytes: Buffer;
    expectedBytes: Buffer;
    updated: string;
    changed: boolean;
}
export interface ScopedUpdatePlan {
    configEdits: ScopedUpdateConfigEdit[];
    configSnapshots: ScopedUpdateConfigSnapshot[];
    configPaths: string[];
    foundSpecs: string[];
    cacheCandidates: string[];
    authoritativeLatest: boolean;
}
export interface ScopedUpdateResult {
    writtenPaths: string[];
    removedCachePaths: string[];
    skippedCachePaths: string[];
}
export declare class ScopedUpdateError extends Error {
    readonly details?: {
        writtenPaths?: string[];
        path?: string;
    } | undefined;
    constructor(message: string, details?: {
        writtenPaths?: string[];
        path?: string;
    } | undefined);
}
export declare function isCanonicalQuotaUpdateSpec(spec: string): boolean;
export declare function sanitizeOpenCodePackageSpec(spec: string, platform?: NodeJS.Platform): string;
export declare function planScopedUpdate(params?: {
    cwd?: string;
    env?: NodeJS.ProcessEnv;
    homeDir?: string;
    platform?: NodeJS.Platform;
}): Promise<ScopedUpdatePlan>;
export declare function applyScopedUpdatePlan(plan: ScopedUpdatePlan, options?: {
    dryRun?: boolean;
    readBytes?: (path: string) => Promise<Buffer>;
    writeText?: (path: string, content: string) => Promise<void>;
    beforeCacheDeletion?: () => Promise<void>;
}): Promise<ScopedUpdateResult>;
export declare function runScopedUpdateCommand(params?: {
    argv?: string[];
    cwd?: string;
    env?: NodeJS.ProcessEnv;
    homeDir?: string;
    platform?: NodeJS.Platform;
    confirm?: (message: string) => Promise<boolean>;
    log?: (message: string) => void;
}): Promise<number>;
//# sourceMappingURL=scoped-update.d.ts.map