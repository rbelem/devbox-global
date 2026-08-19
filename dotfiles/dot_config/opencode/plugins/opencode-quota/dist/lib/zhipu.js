import { queryGlmCodingPlanQuota } from "./glm-coding-plan.js";
import { resolveZhipuAuthCached } from "./zhipu-auth.js";
const ZHIPU_QUOTA = {
    label: "Zhipu",
    endpoint: "https://bigmodel.cn/api/monitor/usage/quota/limit",
    httpErrorPrefix: "Zhipu API error",
    envelope: "zhipu",
    resolveAuth: resolveZhipuAuthCached,
};
export function queryZhipuQuota(options = {}) {
    return queryGlmCodingPlanQuota(ZHIPU_QUOTA, options);
}
//# sourceMappingURL=zhipu.js.map