import type { CanonicalQuotaProviderId } from "./provider-metadata.js";
export interface ProviderModelRef {
    lower: string;
    providerId: string;
    modelId: string;
}
export declare function parseProviderModelRef(model: string): ProviderModelRef;
export declare function providerIdIncludesAny(providerId: string, fragments: readonly string[]): boolean;
export declare function modelProviderIncludesAny(model: string, fragments: readonly string[]): boolean;
export declare function modelProviderMatchesRuntimeId(model: string, canonicalId: CanonicalQuotaProviderId): boolean;
export declare function modelIncludesAny(model: string, fragments: readonly string[]): boolean;
//# sourceMappingURL=provider-model-matching.d.ts.map