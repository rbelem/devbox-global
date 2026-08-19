import { readAuthFileCached } from "./opencode-auth.js";
export const DEFAULT_QWEN_AUTH_CACHE_MAX_AGE_MS = 5_000;
const QWEN_AUTH_KEYS = ["qwen-code", "opencode-qwencode-auth"];
function getQwenOAuthAccessToken(auth) {
    for (const key of QWEN_AUTH_KEYS) {
        const qwen = auth?.[key];
        if (!qwen || qwen.type !== "oauth") {
            continue;
        }
        const accessToken = typeof qwen.access === "string" ? qwen.access.trim() : "";
        if (accessToken) {
            return { accessToken, sourceKey: key };
        }
    }
    return null;
}
export function hasQwenOAuthAuth(auth) {
    return getQwenOAuthAccessToken(auth) !== null;
}
export async function hasQwenOAuthAuthCached(params) {
    const auth = await readAuthFileCached({
        maxAgeMs: Math.max(0, params?.maxAgeMs ?? DEFAULT_QWEN_AUTH_CACHE_MAX_AGE_MS),
    });
    return hasQwenOAuthAuth(auth);
}
export function resolveQwenLocalPlan(auth) {
    const resolved = getQwenOAuthAccessToken(auth);
    if (!resolved) {
        return { state: "none" };
    }
    return { state: "qwen_free", accessToken: resolved.accessToken, sourceKey: resolved.sourceKey };
}
export async function resolveQwenLocalPlanCached(params) {
    const auth = await readAuthFileCached({
        maxAgeMs: Math.max(0, params?.maxAgeMs ?? DEFAULT_QWEN_AUTH_CACHE_MAX_AGE_MS),
    });
    return resolveQwenLocalPlan(auth);
}
export function isQwenCodeModelId(model) {
    return typeof model === "string" && model.toLowerCase().startsWith("qwen-code/");
}
//# sourceMappingURL=qwen-auth.js.map