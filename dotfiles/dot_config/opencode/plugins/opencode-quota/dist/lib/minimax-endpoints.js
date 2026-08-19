export const MINIMAX_QUOTA_ENDPOINTS = {
    international: {
        id: "international",
        label: "MiniMax International",
        apiBaseUrl: "https://api.minimax.io",
        quotaUrl: "https://api.minimax.io/v1/api/openplatform/coding_plan/remains",
    },
    china: {
        id: "china",
        label: "MiniMax China",
        apiBaseUrl: "https://api.minimaxi.com",
        // CN Token Plan docs use this path on minimaxi.com; api.minimaxi.com returns MiniMax base_resp auth errors for it.
        quotaUrl: "https://api.minimaxi.com/v1/token_plan/remains",
    },
};
export function getMiniMaxQuotaEndpoint(id) {
    return MINIMAX_QUOTA_ENDPOINTS[id];
}
//# sourceMappingURL=minimax-endpoints.js.map