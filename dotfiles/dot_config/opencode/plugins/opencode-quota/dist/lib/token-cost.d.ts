import type { CostBuckets } from "./modelsdev-pricing.js";
export interface TokenBucketLike {
    input: number;
    output: number;
    reasoning: number;
    cache_read: number;
    cache_write: number;
}
export declare function calculateUsdFromTokenBuckets(rates: CostBuckets, tokens: TokenBucketLike): number;
//# sourceMappingURL=token-cost.d.ts.map