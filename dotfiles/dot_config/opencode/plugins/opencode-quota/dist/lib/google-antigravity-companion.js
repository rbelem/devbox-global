import { createGoogleCompanionCredentialResolver, } from "./google-companion-credentials.js";
const PACKAGE_NAME = "opencode-antigravity-auth";
const SOURCE_SPECIFIER = `${PACKAGE_NAME}/src/constants.ts`;
const RUNTIME_CANDIDATES = [
    ["dist", "src", "constants.js"],
    ["src", "constants.ts"],
    ["src", "constants.js"],
    ["dist", "index.js"],
];
const descriptor = {
    packageName: PACKAGE_NAME,
    packageScan: "unscoped",
    clientIdExport: "ANTIGRAVITY_CLIENT_ID",
    clientSecretExport: "ANTIGRAVITY_CLIENT_SECRET",
    missingImportSpecifier: SOURCE_SPECIFIER,
    missingError: `Install ${PACKAGE_NAME} separately to enable Google Antigravity quota`,
    invalidError: `Installed ${PACKAGE_NAME} package is incompatible`,
    stages: [
        {
            kind: "dynamic-import",
            specifiers: [`${PACKAGE_NAME}/dist/src/constants.js`, `${PACKAGE_NAME}/src/constants.js`],
        },
        {
            kind: "runtime-files",
            importSpecifier: SOURCE_SPECIFIER,
            candidatePaths: RUNTIME_CANDIDATES,
            readErrors: "fallthrough-missing",
        },
        {
            kind: "source-specifier",
            importSpecifier: SOURCE_SPECIFIER,
            searchRuntimePaths: true,
            readErrors: "fallthrough-missing",
        },
        {
            kind: "package-json",
            importSpecifier: `${PACKAGE_NAME}/package.json`,
            candidateImportSpecifier: `${PACKAGE_NAME}/package.json`,
            candidatePaths: RUNTIME_CANDIDATES,
            readErrors: "fallthrough-missing",
            resolutionErrorImportSpecifier: `${PACKAGE_NAME}/package.json`,
            exhaustedInvalidPath: "package-json",
        },
        {
            kind: "package-entry",
            importSpecifier: PACKAGE_NAME,
            readErrors: "fallthrough-missing",
        },
    ],
};
const resolver = createGoogleCompanionCredentialResolver(descriptor);
export async function inspectAntigravityCompanionPresence() {
    return resolver.inspect();
}
export async function resolveAntigravityClientCredentials() {
    return resolver.resolveCredentials();
}
export function clearAntigravityCompanionCacheForTests() {
    resolver.clearCacheForTests();
}
//# sourceMappingURL=google-antigravity-companion.js.map