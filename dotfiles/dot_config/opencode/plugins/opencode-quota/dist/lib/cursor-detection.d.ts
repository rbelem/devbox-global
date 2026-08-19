export interface CursorAuthPresence {
    state: "missing" | "present" | "invalid";
    selectedPath?: string;
    presentPaths: string[];
    candidatePaths: string[];
    error?: string;
}
export interface CursorOpenCodeIntegration {
    pluginEnabled: boolean;
    providerConfigured: boolean;
    matchedPaths: string[];
    checkedPaths: string[];
}
export declare const CURSOR_CANONICAL_PLUGIN_PACKAGE = "@playwo/opencode-cursor-oauth";
export declare function getCursorAuthCandidatePaths(): string[];
export declare function inspectCursorAuthPresence(): Promise<CursorAuthPresence>;
export declare function inspectCursorOpenCodeIntegration(): Promise<CursorOpenCodeIntegration>;
//# sourceMappingURL=cursor-detection.d.ts.map