import { type RuntimeContextRootHints, type RuntimeContextRoots } from "./config-file-utils.js";
export interface TuiConfigDiagnostics {
    workspaceRoot: string;
    configRoot: string;
    configured: boolean;
    inferredSelectedPath: string | null;
    presentPaths: string[];
    candidatePaths: string[];
    quotaPluginConfigured: boolean;
    quotaPluginConfigPaths: string[];
}
export interface InspectTuiConfigParams {
    cwd?: string;
    roots?: RuntimeContextRootHints | RuntimeContextRoots;
}
export declare function inspectTuiConfig(params?: InspectTuiConfigParams): Promise<TuiConfigDiagnostics>;
//# sourceMappingURL=tui-config-diagnostics.d.ts.map