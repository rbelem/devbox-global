type RelativePath = readonly string[];
type ReadErrorPolicy = "fallthrough-all" | "fallthrough-missing";
export type GoogleCompanionPresence = {
    state: "present";
    importSpecifier: string;
    resolvedPath: string;
} | {
    state: "missing";
    importSpecifier: string;
    error: string;
} | {
    state: "invalid";
    importSpecifier: string;
    error: string;
    resolvedPath?: string;
};
export type GoogleCompanionConfiguredCredentials = {
    state: "configured";
    clientId: string;
    clientSecret: string;
    resolvedPath: string;
};
export type GoogleCompanionClientCredentials = GoogleCompanionConfiguredCredentials | {
    state: "missing" | "invalid";
    error: string;
    resolvedPath?: string;
};
export type GoogleCompanionResolutionStage = {
    kind: "dynamic-import";
    specifiers: readonly string[];
} | {
    kind: "runtime-files";
    importSpecifier: string;
    candidatePaths: readonly RelativePath[];
    readErrors: ReadErrorPolicy;
} | {
    kind: "source-specifier";
    importSpecifier: string;
    searchRuntimePaths: boolean;
    readErrors: ReadErrorPolicy;
} | {
    kind: "package-json";
    importSpecifier: string;
    candidateImportSpecifier: string;
    candidatePaths: readonly RelativePath[];
    readErrors: ReadErrorPolicy;
    resolutionErrorImportSpecifier: string;
    exhaustedInvalidPath: "package-json" | "first-candidate";
} | {
    kind: "package-entry";
    importSpecifier: string;
    readErrors: ReadErrorPolicy;
};
export type GoogleCompanionDescriptor = {
    packageName: string;
    packageScan: "scoped" | "unscoped";
    clientIdExport: string;
    clientSecretExport: string;
    missingImportSpecifier: string;
    missingError: string;
    invalidError: string;
    stages: readonly GoogleCompanionResolutionStage[];
};
export declare function createGoogleCompanionCredentialResolver(descriptor: GoogleCompanionDescriptor): {
    inspect: () => Promise<GoogleCompanionPresence>;
    resolveCredentials: () => Promise<GoogleCompanionClientCredentials>;
    clearCacheForTests: () => void;
};
export {};
//# sourceMappingURL=google-companion-credentials.d.ts.map