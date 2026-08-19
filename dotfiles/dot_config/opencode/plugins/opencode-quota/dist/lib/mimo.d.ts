export interface MimoMonthlyQuota {
    used: number;
    limit: number;
}
export interface MimoPlanDetail {
    planName: string | null;
    planCode: string | null;
    expired: boolean;
}
export interface MimoBalance {
    total: number | null;
    cash: number | null;
    gift: number | null;
    currency: string | null;
}
export type MimoEndpointResult<T> = {
    state: "success";
    data: T;
} | {
    state: "error";
    error: string;
};
export interface MimoDashboardResult {
    usage: MimoEndpointResult<MimoMonthlyQuota>;
    detail: MimoEndpointResult<MimoPlanDetail>;
    balance: MimoEndpointResult<MimoBalance>;
}
export declare function parseMimoUsageResponse(json: unknown): MimoMonthlyQuota;
export declare function parseMimoDetailResponse(json: unknown): MimoPlanDetail;
export declare function parseMimoBalanceResponse(json: unknown): MimoBalance;
export declare function formatMimoDashboardTimeZone(timezoneOffsetMinutes?: number): string;
export declare function queryMimoDashboard(cookie: string, options?: {
    requestTimeoutMs?: number;
}): Promise<MimoDashboardResult>;
//# sourceMappingURL=mimo.d.ts.map