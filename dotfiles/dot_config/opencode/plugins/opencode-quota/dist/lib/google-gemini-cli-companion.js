import { createGoogleCompanionCredentialResolver, } from "./google-companion-credentials.js";
const PACKAGE_NAME = "opencode-gemini-auth";
const SOURCE_SPECIFIER = `${PACKAGE_NAME}/src/constants.ts`;
const RUNTIME_CANDIDATES = [
    ["src", "constants.ts"],
    ["src", "constants.js"],
    ["dist", "src", "constants.js"],
    ["dist", "index.js"],
];
const descriptor = {
    packageName: PACKAGE_NAME,
    packageScan: "unscoped",
    clientIdExport: "GEMINI_CLIENT_ID",
    clientSecretExport: "GEMINI_CLIENT_SECRET",
    missingImportSpecifier: SOURCE_SPECIFIER,
    missingError: `Install ${PACKAGE_NAME} separately to enable Gemini CLI quota`,
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
export async function inspectGeminiCliCompanionPresence() {
    return resolver.inspect();
}
export async function resolveGeminiCliClientCredentials() {
    return resolver.resolveCredentials();
}
export function clearGeminiCliCompanionCacheForTests() {
    resolver.clearCacheForTests();
}
//# sourceMappingURL=google-gemini-cli-companion.js.map