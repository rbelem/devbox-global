import { sanitizeQuotaRenderData } from "./display-sanitize.js";
import { formatQuotaRows } from "./format.js";
export const TUI_SIDEBAR_MAX_WIDTH = 36;
export const TUI_SIDEBAR_LAYOUT = {
    maxWidth: TUI_SIDEBAR_MAX_WIDTH,
    narrowAt: TUI_SIDEBAR_MAX_WIDTH,
    tinyAt: 20,
};
export function buildSidebarQuotaPanelLines(params) {
    const data = sanitizeQuotaRenderData(params.data);
    const quotaBody = formatQuotaRows({
        version: "1.0.0",
        layout: TUI_SIDEBAR_LAYOUT,
        entries: data.entries,
        errors: data.errors,
        style: params.config.formatStyle,
        percentDisplayMode: params.config.percentDisplayMode,
        resetTimeDecimals: params.config.resetTimeDecimals,
        sessionTokens: data.sessionTokens,
    });
    return quotaBody ? quotaBody.split("\n") : [];
}
//# sourceMappingURL=tui-sidebar-format.js.map