export type TokenBuckets = {
    input: number;
    output: number;
    reasoning: number;
    cache_read: number;
    cache_write: number;
};
type TokenCarrier = {
    tokens?: {
        input?: number;
        output?: number;
        reasoning?: number;
        cache?: {
            read?: number;
            write?: number;
        };
    } | null;
};
export declare function emptyTokenBuckets(): TokenBuckets;
export declare function addTokenBuckets(a: TokenBuckets, b: TokenBuckets): TokenBuckets;
export declare function totalTokenBuckets(buckets: TokenBuckets): number;
export declare function tokenBucketsFromMessage(message: TokenCarrier): TokenBuckets;
export {};
//# sourceMappingURL=token-buckets.d.ts.map