import type { QuotaProvider } from "../lib/entries.js";
import type { CanonicalQuotaProviderId } from "../lib/provider-metadata.js";
type GlmQuotaWindow = {
    percentRemaining: number;
    resetTimeIso?: string;
};
type GlmQuotaResult = {
    success: true;
    label: string;
    windows: {
        fiveHour?: GlmQuotaWindow;
        weekly?: GlmQuotaWindow;
        mcp?: GlmQuotaWindow;
    };
};
export declare function createGlmCodingPlanProvider(params: {
    id: "zai" | "zhipu";
    providerId: CanonicalQuotaProviderId;
    errorLabel: string;
    authCacheMaxAgeMs: number;
    resolveAuth: (params: {
        maxAgeMs: number;
    }) => Promise<{
        state: string;
    }>;
    getAuthDiagnostics: (params: {
        maxAgeMs: number;
    }) => Promise<{
        state: string;
        source: string | null;
        checkedPaths: string[];
        authPaths: string[];
        error?: string;
    }>;
    queryQuota: (params: {
        requestTimeoutMs?: number;
    }) => Promise<GlmQuotaResult | {
        success: false;
        error: string;
    } | null>;
    matchesCurrentModel: (model: string) => boolean;
}): QuotaProvider;
export {};
//# sourceMappingURL=glm-coding-plan-provider.d.ts.map