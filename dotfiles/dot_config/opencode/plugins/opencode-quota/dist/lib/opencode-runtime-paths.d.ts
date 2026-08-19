export interface OpencodeRuntimeDirs {
    dataDir: string;
    configDir: string;
    cacheDir: string;
    stateDir: string;
}
export interface OpencodeRuntimeDirCandidates {
    dataDirs: string[];
    configDirs: string[];
    cacheDirs: string[];
    stateDirs: string[];
}
export declare function getOpencodeRuntimeDirs(params?: {
    env?: NodeJS.ProcessEnv;
    homeDir?: string;
}): OpencodeRuntimeDirs;
export declare function getOpencodeRuntimeDirCandidates(params?: {
    platform?: NodeJS.Platform;
    env?: NodeJS.ProcessEnv;
    homeDir?: string;
    primary?: OpencodeRuntimeDirs;
}): OpencodeRuntimeDirCandidates;
//# sourceMappingURL=opencode-runtime-paths.d.ts.map