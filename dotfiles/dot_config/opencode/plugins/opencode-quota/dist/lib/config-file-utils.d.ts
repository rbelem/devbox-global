export type ConfigFileKind = "opencode" | "tui";
export type ConfigFileFormat = "json" | "jsonc";
export interface EditableConfigPath {
    path: string;
    sourcePath: string;
    format: ConfigFileFormat;
    existed: boolean;
    removeSourcePath?: string;
}
export interface RuntimeContextRootHints {
    workspaceRoot?: string | null;
    worktreeRoot?: string | null;
    activeDirectory?: string | null;
    configRoot?: string | null;
    fallbackDirectory: string;
}
export interface RuntimeContextRoots {
    workspaceRoot: string;
    configRoot: string;
}
export declare function dedupeNonEmptyStrings(items: string[]): string[];
/**
 * Returns the effective config root directory.
 *
 * Priority:
 * 1. `OPENCODE_CONFIG_DIR` environment variable (if set and non-empty)
 * 2. The provided fallback directory
 *
 * This matches OpenCode's own behavior: when `OPENCODE_CONFIG_DIR` is set,
 * config files are resolved relative to it rather than the current working directory.
 */
export declare function getEffectiveConfigRoot(fallback: string): string;
export declare function resolveRuntimeContextRoots(params: RuntimeContextRootHints): RuntimeContextRoots;
export declare function findGitWorktreeRoot(startDir: string): string | null;
export declare function getConfigFileCandidatePaths(dir: string, kind: ConfigFileKind): string[];
export declare function resolveExistingConfigPath(dir: string, kind: ConfigFileKind): string | null;
export declare function resolveEditableConfigPath(params: {
    dir: string;
    kind: ConfigFileKind;
    preferredFormat?: ConfigFileFormat;
    convertJsonToJsonc?: boolean;
}): EditableConfigPath;
export declare function getPluginSpecFromEntry(entry: unknown): string | null;
export declare function extractPluginSpecsFromParsedConfig(parsed: unknown): string[];
export declare function extractProviderIdsFromParsedConfig(parsed: unknown): string[];
export declare function isQuotaPluginSpec(spec: string, kind: ConfigFileKind): boolean;
//# sourceMappingURL=config-file-utils.d.ts.map