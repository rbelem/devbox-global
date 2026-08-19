import { QUOTA_PROVIDER_RUNTIME_IDS } from "./provider-metadata.js";
export function parseProviderModelRef(model) {
    const lower = model.toLowerCase();
    const [providerId = "", modelId = ""] = lower.split("/", 2);
    return { lower, providerId, modelId };
}
export function providerIdIncludesAny(providerId, fragments) {
    const lowerProviderId = providerId.toLowerCase();
    return fragments.some((fragment) => lowerProviderId.includes(fragment.toLowerCase()));
}
export function modelProviderIncludesAny(model, fragments) {
    const { providerId } = parseProviderModelRef(model);
    return providerIdIncludesAny(providerId, fragments);
}
export function modelProviderMatchesRuntimeId(model, canonicalId) {
    const { providerId } = parseProviderModelRef(model);
    return QUOTA_PROVIDER_RUNTIME_IDS[canonicalId].includes(providerId);
}
export function modelIncludesAny(model, fragments) {
    const lower = model.toLowerCase();
    return fragments.some((fragment) => lower.includes(fragment.toLowerCase()));
}
//# sourceMappingURL=provider-model-matching.js.map