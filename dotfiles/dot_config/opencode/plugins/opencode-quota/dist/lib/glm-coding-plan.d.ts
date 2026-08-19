import type { InvalidAwareAuthResult } from "./api-key-resolver.js";
import type { ZaiResult } from "./types.js";
type GlmCodingPlanDescriptor = {
    label: string;
    endpoint: string;
    httpErrorPrefix: string;
    resolveAuth: () => Promise<InvalidAwareAuthResult>;
} & ({
    envelope: "zai";
    apiErrorPrefix: string;
} | {
    envelope: "zhipu";
});
export declare function queryGlmCodingPlanQuota(descriptor: GlmCodingPlanDescriptor, options?: {
    requestTimeoutMs?: number;
}): Promise<ZaiResult>;
export {};
//# sourceMappingURL=glm-coding-plan.d.ts.map