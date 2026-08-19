export type MiniMaxQuotaEndpointId = "international" | "china";
export interface MiniMaxQuotaEndpoint {
    id: MiniMaxQuotaEndpointId;
    label: string;
    apiBaseUrl: string;
    quotaUrl: string;
}
export declare const MINIMAX_QUOTA_ENDPOINTS: Readonly<Record<MiniMaxQuotaEndpointId, MiniMaxQuotaEndpoint>>;
export declare function getMiniMaxQuotaEndpoint(id: MiniMaxQuotaEndpointId): MiniMaxQuotaEndpoint;
//# sourceMappingURL=minimax-endpoints.d.ts.map