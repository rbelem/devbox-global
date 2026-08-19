import { lstat, readFile, realpath, rm } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { writeTextAtomic } from "./atomic-json.js";
import { findGitWorktreeRoot, resolveExistingConfigPath, } from "./config-file-utils.js";
import { editConfigDocumentPaths, parseConfigDocument } from "./opencode-config-editor.js";
import { getOpencodeRuntimeDirCandidates, getOpencodeRuntimeDirs, } from "./opencode-runtime-paths.js";
export const QUOTA_PACKAGE_NAME = "@slkiser/opencode-quota";
export const QUOTA_LATEST_SPEC = `${QUOTA_PACKAGE_NAME}@latest`;
const GITHUB_REPO_URL = "https://github.com/slkiser/opencode-quota";
const EXACT_SEMVER = /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;
export class ScopedUpdateError extends Error {
    details;
    constructor(message, details) {
        super(message);
        this.details = details;
        this.name = "ScopedUpdateError";
    }
}
export function isCanonicalQuotaUpdateSpec(spec) {
    if (spec === QUOTA_PACKAGE_NAME || spec === QUOTA_LATEST_SPEC)
        return true;
    const prefix = `${QUOTA_PACKAGE_NAME}@`;
    return spec.startsWith(prefix) && EXACT_SEMVER.test(spec.slice(prefix.length));
}
export function sanitizeOpenCodePackageSpec(spec, platform = process.platform) {
    if (platform !== "win32")
        return spec;
    return Array.from(spec, (char) => new Set(["<", ">", ":", '"', "|", "?", "*"]).has(char) || char.charCodeAt(0) < 32 ? "_" : char).join("");
}
function effectiveGlobalConfigDir(params) {
    const fallback = getOpencodeRuntimeDirs({
        env: params.env,
        homeDir: params.homeDir,
    }).configDir;
    const configured = params.env.OPENCODE_CONFIG_DIR?.trim();
    if (!configured)
        return fallback;
    return isAbsolute(configured) ? configured : resolve(fallback, configured);
}
function selectedConfigPaths(root) {
    return ["opencode", "tui"].flatMap((kind) => {
        const path = resolveExistingConfigPath(root, kind);
        return path ? [path] : [];
    });
}
async function dedupeByRealPath(paths) {
    const output = [];
    const seen = new Set();
    for (const path of paths) {
        const resolved = await realpath(path);
        if (seen.has(resolved))
            continue;
        seen.add(resolved);
        output.push(path);
    }
    return output;
}
function pluginArrays(config) {
    if (!config || typeof config !== "object" || Array.isArray(config))
        return [];
    const root = config;
    const arrays = [];
    if (Array.isArray(root.plugin))
        arrays.push({ path: ["plugin"], entries: root.plugin });
    if (root.tui && typeof root.tui === "object" && !Array.isArray(root.tui)) {
        const tui = root.tui;
        if (Array.isArray(tui.plugin))
            arrays.push({ path: ["tui", "plugin"], entries: tui.plugin });
    }
    return arrays;
}
function updateConfig(raw, path) {
    const format = path.endsWith(".jsonc") ? "jsonc" : "json";
    let parsed;
    try {
        parsed = parseConfigDocument(raw, format, path);
    }
    catch {
        throw new ScopedUpdateError(`Cannot update unparseable config: ${path}`, { path });
    }
    const edits = [];
    let replacements = 0;
    const specs = [];
    for (const array of pluginArrays(parsed)) {
        for (let index = array.entries.length - 1; index >= 0; index--) {
            const entry = array.entries[index];
            const spec = typeof entry === "string"
                ? entry
                : Array.isArray(entry) && typeof entry[0] === "string"
                    ? entry[0]
                    : null;
            if (spec === null || !isCanonicalQuotaUpdateSpec(spec))
                continue;
            specs.push(spec);
            if (spec === QUOTA_LATEST_SPEC)
                continue;
            const targetPath = typeof entry === "string" ? [...array.path, index] : [...array.path, index, 0];
            edits.push({ path: targetPath, value: QUOTA_LATEST_SPEC });
            replacements++;
        }
    }
    const updated = editConfigDocumentPaths({ raw, format, path, edits });
    return { updated, replacements, specs };
}
export async function planScopedUpdate(params = {}) {
    const cwd = params.cwd ?? process.cwd();
    const env = params.env ?? process.env;
    const projectRoot = findGitWorktreeRoot(cwd) ?? cwd;
    const globalRoot = effectiveGlobalConfigDir({ env, homeDir: params.homeDir });
    const configPaths = await dedupeByRealPath([
        ...selectedConfigPaths(projectRoot),
        ...selectedConfigPaths(globalRoot),
    ]);
    const configEdits = [];
    const configSnapshots = [];
    const foundSpecs = [];
    for (const path of configPaths) {
        const originalBytes = await readFile(path);
        const original = originalBytes.toString("utf8");
        const planned = updateConfig(original, path);
        foundSpecs.push(...planned.specs);
        const changed = planned.updated !== original;
        configSnapshots.push({
            path,
            originalBytes,
            expectedBytes: changed ? Buffer.from(planned.updated, "utf8") : originalBytes,
            updated: planned.updated,
            changed,
        });
        if (changed) {
            configEdits.push({
                path,
                original,
                originalBytes,
                updated: planned.updated,
                replacements: planned.replacements,
            });
        }
    }
    const uniqueSpecs = [...new Set(foundSpecs)];
    const cacheSpecs = [...new Set([...uniqueSpecs, QUOTA_LATEST_SPEC])];
    const runtime = getOpencodeRuntimeDirCandidates({
        platform: params.platform,
        env,
        homeDir: params.homeDir,
    });
    const cacheCandidates = runtime.cacheDirs.flatMap((cacheDir) => cacheSpecs.map((spec) => join(cacheDir, "packages", sanitizeOpenCodePackageSpec(spec, params.platform))));
    return {
        configEdits,
        configSnapshots,
        configPaths,
        foundSpecs: uniqueSpecs,
        cacheCandidates: [...new Set(cacheCandidates)],
        authoritativeLatest: uniqueSpecs.length > 0,
    };
}
function containedBy(root, candidate) {
    const rel = relative(root, candidate);
    return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}
async function removeVerifiedCacheCandidate(path) {
    const packagesPath = dirname(dirname(path));
    try {
        const packagesStat = await lstat(packagesPath);
        const ownerStat = await lstat(dirname(path));
        if (packagesStat.isSymbolicLink() || ownerStat.isSymbolicLink())
            return "skipped";
        const packagesReal = await realpath(packagesPath);
        const stat = await lstat(path);
        if (stat.isSymbolicLink() || !stat.isDirectory())
            return "skipped";
        const candidateReal = await realpath(path);
        if (!containedBy(packagesReal, candidateReal) || candidateReal === packagesReal)
            return "skipped";
        const manifestPath = join(candidateReal, "node_modules", "@slkiser", "opencode-quota", "package.json");
        const manifestStat = await lstat(manifestPath);
        if (manifestStat.isSymbolicLink() || !manifestStat.isFile())
            return "skipped";
        const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
        if (manifest.name !== QUOTA_PACKAGE_NAME)
            return "skipped";
        await rm(candidateReal, { recursive: true, force: false });
        return "removed";
    }
    catch {
        return "skipped";
    }
}
export async function applyScopedUpdatePlan(plan, options = {}) {
    if (options.dryRun) {
        return { writtenPaths: [], removedCachePaths: [], skippedCachePaths: [] };
    }
    const readBytes = options.readBytes ?? ((path) => readFile(path));
    const writeText = options.writeText ?? writeTextAtomic;
    const writtenPaths = [];
    const failure = (action, path) => {
        const changed = writtenPaths.length > 0 ? ` Changed before failure: ${writtenPaths.join(", ")}.` : "";
        return new ScopedUpdateError(`${action} ${path}; no cache was deleted.${changed}`, {
            path,
            writtenPaths: [...writtenPaths],
        });
    };
    for (const snapshot of plan.configSnapshots) {
        let current;
        try {
            current = await readBytes(snapshot.path);
        }
        catch {
            throw failure("Failed reading", snapshot.path);
        }
        if (!current.equals(snapshot.originalBytes)) {
            throw failure("Config changed since preview:", snapshot.path);
        }
        if (!snapshot.changed)
            continue;
        try {
            await writeText(snapshot.path, snapshot.updated);
            writtenPaths.push(snapshot.path);
        }
        catch {
            throw failure("Failed writing", snapshot.path);
        }
    }
    await options.beforeCacheDeletion?.();
    let authoritativeLatest = false;
    for (const snapshot of plan.configSnapshots) {
        let current;
        try {
            current = await readBytes(snapshot.path);
        }
        catch {
            throw failure("Failed re-reading", snapshot.path);
        }
        if (!current.equals(snapshot.expectedBytes)) {
            throw failure("Config changed before cache deletion:", snapshot.path);
        }
        const currentPlan = updateConfig(current.toString("utf8"), snapshot.path);
        if (currentPlan.specs.includes(QUOTA_LATEST_SPEC))
            authoritativeLatest = true;
    }
    const removedCachePaths = [];
    const skippedCachePaths = [];
    if (authoritativeLatest) {
        for (const candidate of plan.cacheCandidates) {
            const result = await removeVerifiedCacheCandidate(candidate);
            (result === "removed" ? removedCachePaths : skippedCachePaths).push(candidate);
        }
    }
    return { writtenPaths, removedCachePaths, skippedCachePaths };
}
export async function runScopedUpdateCommand(params = {}) {
    const argv = params.argv ?? [];
    const unknown = argv.filter((arg) => arg !== "--dry-run" && arg !== "--yes");
    if (unknown.length > 0)
        return 1;
    const dryRun = argv.includes("--dry-run");
    const yes = argv.includes("--yes");
    const log = params.log ?? console.log;
    try {
        const plan = await planScopedUpdate(params);
        log("Scoped OpenCode Quota update preview:");
        for (const edit of plan.configEdits) {
            log(`  edit ${edit.path} (${edit.replacements} replacement(s))`);
        }
        for (const candidate of plan.cacheCandidates)
            log(`  cache candidate ${candidate}`);
        if (plan.configPaths.length === 0 || !plan.authoritativeLatest) {
            log("OpenCode Quota update is already current. No files changed.");
            log(`If OpenCode Quota helps, please consider a star: ${GITHUB_REPO_URL}`);
            return 0;
        }
        if (dryRun) {
            log("OpenCode Quota update preview complete — no files changed. Run npx @slkiser/opencode-quota@latest update to apply.");
            return 0;
        }
        if (!yes) {
            const confirm = params.confirm ??
                (async (message) => {
                    const prompts = await import("@clack/prompts");
                    const answer = await prompts.confirm({ message });
                    return !prompts.isCancel(answer) && answer === true;
                });
            if (!(await confirm("Apply these config edits and delete only verified cache directories?"))) {
                log("OpenCode Quota update cancelled — no files changed.");
                return 0;
            }
        }
        const result = await applyScopedUpdatePlan(plan);
        for (const path of result.writtenPaths)
            log(`Updated ${path}`);
        for (const path of result.removedCachePaths)
            log(`Removed ${path}`);
        for (const path of result.skippedCachePaths)
            log(`Skipped unverified cache candidate ${path}`);
        log("OpenCode Quota update complete.");
        log(`Configured paths: ${plan.configPaths.join(", ")}`);
        log("Restart OpenCode and run /quota.");
        log(`If OpenCode Quota helps, please consider a star: ${GITHUB_REPO_URL}`);
        return 0;
    }
    catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        log(`OpenCode Quota update failed: ${reason}`);
        const writtenPaths = error instanceof ScopedUpdateError ? (error.details?.writtenPaths ?? []) : [];
        log(writtenPaths.length > 0
            ? `Files changed before failure: ${writtenPaths.join(", ")}. Fix the reason above, then rerun update.`
            : "No files changed. Fix the reason above, then rerun update.");
        return 1;
    }
}
//# sourceMappingURL=scoped-update.js.map