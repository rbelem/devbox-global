import type { QuotaProviderContext } from "./entries.js";
import { type CanonicalQuotaProviderId } from "./provider-metadata.js";
export declare function isAnyProviderIdAvailable(params: {
    ctx: Pick<QuotaProviderContext, "resolveRuntimeProviderIds">;
    candidateIds: readonly string[];
    fallbackOnError: boolean;
}): Promise<boolean>;
export declare function isCanonicalProviderAvailable(params: {
    ctx: Pick<QuotaProviderContext, "resolveRuntimeProviderIds">;
    providerId: CanonicalQuotaProviderId;
    fallbackOnError: boolean;
}): Promise<boolean>;
//# sourceMappingURL=provider-availability.d.ts.map