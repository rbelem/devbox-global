import { existsSync } from "fs";
export function pickFirstExistingPath(candidates) {
    for (const p of candidates) {
        try {
            if (existsSync(p))
                return p;
        }
        catch {
            // ignore
        }
    }
    // Deterministic fallback for diagnostics.
    return candidates[0] ?? "";
}
//# sourceMappingURL=path-pick.js.map