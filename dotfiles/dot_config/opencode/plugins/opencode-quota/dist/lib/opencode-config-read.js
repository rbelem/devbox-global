import { existsSync } from "fs";
import { readFile } from "fs/promises";
import { join } from "path";
import { parseJsonOrJsonc } from "./jsonc.js";
export function buildOpenCodeConfigCandidates(params) {
    return params.directories.flatMap((directory) => params.formatOrder.map((format) => ({
        path: join(directory, `opencode.${format}`),
        format,
    })));
}
export function selectFirstExistingOpenCodeConfigCandidate(candidates) {
    return candidates.find((candidate) => existsSync(candidate.path)) ?? null;
}
export async function readOpenCodeConfigCandidate(candidate) {
    if (!existsSync(candidate.path)) {
        return { state: "missing", candidate };
    }
    try {
        const content = await readFile(candidate.path, "utf8");
        return {
            state: "parsed",
            candidate,
            value: parseJsonOrJsonc(content, candidate.format === "jsonc"),
        };
    }
    catch {
        return { state: "invalid", candidate };
    }
}
//# sourceMappingURL=opencode-config-read.js.map