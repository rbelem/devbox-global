/**
 * OpenCode auth.json reader
 *
 * Shared helper to read auth from ~/.local/share/opencode/auth.json
 * (or platform equivalent). Providers should prefer this to duplicating
 * file/path parsing.
 */
import type { AuthData } from "./types.js";
/**
 * Get candidate auth.json paths in priority order.
 * Some OpenCode installations use Linux-style paths even on macOS,
 * so we check multiple locations.
 */
export declare function getAuthPaths(): string[];
/** Returns OpenCode's primary auth.json path (for display/logging) */
export declare function getAuthPath(): string;
export declare function readAuthFile(): Promise<AuthData | null>;
/**
 * Cached auth reader for frequently triggered code paths (e.g. per-question hooks).
 * This avoids repeated filesystem reads while keeping auth updates visible quickly.
 */
export declare function readAuthFileCached(params?: {
    maxAgeMs?: number;
}): Promise<AuthData | null>;
/** Test helper to clear cached auth state between test cases. */
export declare function clearReadAuthFileCacheForTests(): void;
//# sourceMappingURL=opencode-auth.d.ts.map