import { createGoogleCompanionCredentialResolver, } from "./google-companion-credentials.js";
const PACKAGE_NAME = "@anthonyhaussman/opencode-agy-auth";
const SOURCE_SPECIFIER = `${PACKAGE_NAME}/src/constants.ts`;
const RUNTIME_CANDIDATES = [
    ["src", "constants.ts"],
    ["src", "constants.js"],
    ["dist", "src", "constants.js"],
    ["dist", "index.js"],
];
const descriptor = {
    packageName: PACKAGE_NAME,
    packageScan: "scoped",
    clientIdExport: "AGY_CLIENT_ID",
    clientSecretExport: "AGY_CLIENT_SECRET",
    missingImportSpecifier: SOURCE_SPECIFIER,
    missingError: `Install ${PACKAGE_NAME} separately to enable Google AGY quota`,
    invalidError: `Installed ${PACKAGE_NAME} package is incompatible`,
    stages: [
        {
            kind: "dynamic-import",
            specifiers: [`${PACKAGE_NAME}/dist/src/constants.js`, `${PACKAGE_NAME}/src/constants.js`],
        },
        {
            kind: "source-specifier",
            importSpecifier: SOURCE_SPECIFIER,
            searchRuntimePaths: false,
            readErrors: "fallthrough-all",
        },
        {
            kind: "runtime-files",
            importSpecifier: SOURCE_SPECIFIER,
            candidatePaths: RUNTIME_CANDIDATES,
            readErrors: "fallthrough-all",
        },
        {
            kind: "package-json",
            importSpecifier: `${PACKAGE_NAME}/package.json`,
            candidateImportSpecifier: SOURCE_SPECIFIER,
            candidatePaths: [
                ["src", "constants.ts"],
                ["dist", "index.js"],
            ],
            readErrors: "fallthrough-all",
            resolutionErrorImportSpecifier: SOURCE_SPECIFIER,
            exhaustedInvalidPath: "first-candidate",
        },
        {
            kind: "package-entry",
            importSpecifier: PACKAGE_NAME,
            readErrors: "fallthrough-all",
        },
    ],
};
const resolver = createGoogleCompanionCredentialResolver(descriptor);
export async function inspectAgyCompanionPresence() {
    return resolver.inspect();
}
export async function resolveAgyClientCredentials() {
    return resolver.resolveCredentials();
}
export function clearAgyCompanionCacheForTests() {
    resolver.clearCacheForTests();
}
//# sourceMappingURL=google-agy-companion.js.map