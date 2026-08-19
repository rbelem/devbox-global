import { readFile } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
let cachedVersion;
let cachedPromise = null;
export async function getPackageVersion() {
    if (cachedVersion)
        return cachedVersion;
    if (cachedPromise)
        return cachedPromise;
    cachedPromise = (async () => {
        try {
            const here = dirname(fileURLToPath(import.meta.url));
            const pkgPath = join(here, "..", "..", "package.json");
            const raw = await readFile(pkgPath, "utf-8");
            const parsed = JSON.parse(raw);
            const v = typeof parsed?.version === "string" ? parsed.version : undefined;
            cachedVersion = v;
            return v;
        }
        catch {
            return undefined;
        }
        finally {
            cachedPromise = null;
        }
    })();
    return cachedPromise;
}
//# sourceMappingURL=version.js.map