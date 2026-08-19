import type { QuotaProvider, QuotaProviderContext } from "./entries.js";
import type { QuotaExport } from "./quota-export-types.js";
import type { QuotaRuntimeContext } from "./quota-runtime-context.js";
/**
 * Builds the provider context used to read cached quota for export.
 *
 * The cache key is derived from these fields, so it MUST match the one the TUI
 * background writer used (`onlyCurrentModel: false`, no session). Otherwise a
 * user with `onlyCurrentModel: true` would compute a different key than the one
 * the cache was written under, turning every provider into "unavailable".
 *
 * Both export surfaces (CLI `show --json` and the TUI periodic writer) must go
 * through this helper so the cache-key contract lives in one place.
 */
export declare function createExportProviderContext(runtime: QuotaRuntimeContext): QuotaProviderContext;
/**
 * Resolves the export file path from a configured value.
 *
 * - Empty string → XDG cache default: `$XDG_CACHE_HOME/opencode/quota-export.json`
 * - Starts with `~/` → expands `~` to `homedir()`
 * - Starts with `~\` → expands `~` and treats backslashes as path separators
 * - Otherwise → returns as-is (caller is responsible for absolute paths)
 */
export declare function resolveExportPath(configured: string): string;
/**
 * Builds a `QuotaExport` document by reading cached provider results.
 *
 * All providers are read in parallel from the per-provider disk cache.
 * No live network fetches are performed.
 */
export declare function buildQuotaExport(params: {
    providers: QuotaProvider[];
    ctx: QuotaProviderContext;
    ttlMs: number;
    fromCache: boolean;
}): Promise<QuotaExport>;
/**
 * Writes a `QuotaExport` document atomically to disk.
 *
 * Errors are re-thrown — callers are responsible for catching and logging them.
 */
export declare function writeQuotaExport(exportData: QuotaExport, resolvedPath: string): Promise<void>;
//# sourceMappingURL=quota-export.d.ts.map