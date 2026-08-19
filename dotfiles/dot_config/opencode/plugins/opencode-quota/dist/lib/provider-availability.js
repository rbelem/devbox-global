import { getQuotaProviderRuntimeIds } from "./provider-metadata.js";
export async function isAnyProviderIdAvailable(params) {
    const { ctx, candidateIds, fallbackOnError } = params;
    try {
        const ids = await ctx.resolveRuntimeProviderIds();
        return candidateIds.some((id) => ids.has(id));
    }
    catch {
        return fallbackOnError;
    }
}
export async function isCanonicalProviderAvailable(params) {
    const { ctx, providerId, fallbackOnError } = params;
    return isAnyProviderIdAvailable({
        ctx,
        candidateIds: getQuotaProviderRuntimeIds(providerId),
        fallbackOnError,
    });
}
//# sourceMappingURL=provider-availability.js.map