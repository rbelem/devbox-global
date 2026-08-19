import { existsSync } from "fs";
import { readFile } from "fs/promises";
import { join } from "path";
import { dedupeNonEmptyStrings, extractPluginSpecsFromParsedConfig, findGitWorktreeRoot, getConfigFileCandidatePaths, isQuotaPluginSpec, resolveRuntimeContextRoots, } from "./config-file-utils.js";
import { parseJsonOrJsonc } from "./jsonc.js";
import { getOpencodeRuntimeDirCandidates } from "./opencode-runtime-paths.js";
function resolveTuiConfigRoots(params) {
    const cwd = params?.cwd ?? process.cwd();
    const providedRoots = params?.roots;
    if (providedRoots) {
        if ("fallbackDirectory" in providedRoots) {
            return resolveRuntimeContextRoots(providedRoots);
        }
        return {
            workspaceRoot: providedRoots.workspaceRoot,
            configRoot: providedRoots.configRoot,
        };
    }
    return resolveRuntimeContextRoots({
        worktreeRoot: findGitWorktreeRoot(cwd),
        activeDirectory: cwd,
        fallbackDirectory: cwd,
    });
}
function getTuiConfigCandidatePaths(roots) {
    const { configDirs } = getOpencodeRuntimeDirCandidates();
    const searchRoots = dedupeNonEmptyStrings([
        ...configDirs,
        roots.workspaceRoot,
        join(roots.workspaceRoot, ".opencode"),
        roots.configRoot,
        join(roots.configRoot, ".opencode"),
    ]);
    return searchRoots.flatMap((dir) => getConfigFileCandidatePaths(dir, "tui"));
}
async function readConfigJson(path) {
    try {
        const content = await readFile(path, "utf-8");
        return parseJsonOrJsonc(content, path.endsWith(".jsonc"));
    }
    catch {
        return null;
    }
}
async function findQuotaPluginConfigPaths(paths) {
    const quotaPluginConfigPaths = [];
    for (const path of paths) {
        const parsed = await readConfigJson(path);
        const specs = extractPluginSpecsFromParsedConfig(parsed);
        if (specs.some((spec) => isQuotaPluginSpec(spec, "tui"))) {
            quotaPluginConfigPaths.push(path);
        }
    }
    return quotaPluginConfigPaths;
}
export async function inspectTuiConfig(params) {
    const roots = resolveTuiConfigRoots(params);
    const candidatePaths = getTuiConfigCandidatePaths(roots);
    const presentPaths = candidatePaths.filter((path) => existsSync(path));
    const quotaPluginConfigPaths = await findQuotaPluginConfigPaths(presentPaths);
    return {
        workspaceRoot: roots.workspaceRoot,
        configRoot: roots.configRoot,
        configured: presentPaths.length > 0,
        inferredSelectedPath: presentPaths[presentPaths.length - 1] ?? null,
        presentPaths,
        candidatePaths,
        quotaPluginConfigured: quotaPluginConfigPaths.length > 0,
        quotaPluginConfigPaths,
    };
}
//# sourceMappingURL=tui-config-diagnostics.js.map