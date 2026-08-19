import type { ConfigFileFormat } from "./config-file-utils.js";
export interface OpenCodeConfigCandidate {
    path: string;
    format: ConfigFileFormat;
}
export type ReadOpenCodeConfigResult = {
    state: "missing";
    candidate: OpenCodeConfigCandidate;
} | {
    state: "invalid";
    candidate: OpenCodeConfigCandidate;
} | {
    state: "parsed";
    candidate: OpenCodeConfigCandidate;
    value: unknown;
};
export declare function buildOpenCodeConfigCandidates(params: {
    directories: readonly string[];
    formatOrder: readonly ConfigFileFormat[];
}): OpenCodeConfigCandidate[];
export declare function selectFirstExistingOpenCodeConfigCandidate(candidates: readonly OpenCodeConfigCandidate[]): OpenCodeConfigCandidate | null;
export declare function readOpenCodeConfigCandidate(candidate: OpenCodeConfigCandidate): Promise<ReadOpenCodeConfigResult>;
//# sourceMappingURL=opencode-config-read.d.ts.map