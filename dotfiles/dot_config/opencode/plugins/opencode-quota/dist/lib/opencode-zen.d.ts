/**
 * Conversion used by the OpenCode billing-page values in PR #140.
 * The source represents one US dollar as 100,000,000 billing units.
 */
export declare const OPENCODE_ZEN_BILLING_UNITS_PER_DOLLAR = 100000000;
export interface OpenCodeZenBillingData {
    balance: number;
    monthlyLimit: number | null;
    monthlyUsage: number | null;
    lastPayment: number | null;
}
export type OpenCodeZenResult = {
    success: true;
    data: OpenCodeZenBillingData;
} | {
    success: false;
    error: string;
};
declare function parseSsrBillingData(html: string): OpenCodeZenBillingData | null;
declare function parseNewSsrBillingData(html: string): OpenCodeZenBillingData | null;
declare function parseNewSsrPaymentData(html: string): number | null;
declare function parseDataSlotBillingData(html: string): OpenCodeZenBillingData | null;
declare function parseSsrPaymentData(html: string): number | null;
declare function parseDataSlotPaymentData(html: string): number | null;
export declare function queryOpenCodeZenQuota(workspaceId: string, authCookie: string, options?: {
    requestTimeoutMs?: number;
}): Promise<OpenCodeZenResult>;
export { parseDataSlotBillingData as _parseDataSlotBillingData, parseDataSlotPaymentData as _parseDataSlotPaymentData, parseNewSsrBillingData as _parseNewSsrBillingData, parseNewSsrPaymentData as _parseNewSsrPaymentData, parseSsrBillingData as _parseSsrBillingData, parseSsrPaymentData as _parseSsrPaymentData, };
//# sourceMappingURL=opencode-zen.d.ts.map