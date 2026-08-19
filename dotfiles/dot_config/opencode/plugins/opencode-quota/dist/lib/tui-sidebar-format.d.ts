import type { QuotaRenderData } from "./quota-render-data.js";
import type { QuotaToastConfig } from "./types.js";
export declare const TUI_SIDEBAR_MAX_WIDTH = 36;
export declare const TUI_SIDEBAR_LAYOUT: {
    readonly maxWidth: 36;
    readonly narrowAt: 36;
    readonly tinyAt: 20;
};
export declare function buildSidebarQuotaPanelLines(params: {
    data: QuotaRenderData;
    config: Pick<QuotaToastConfig, "formatStyle" | "percentDisplayMode" | "resetTimeDecimals">;
}): string[];
//# sourceMappingURL=tui-sidebar-format.d.ts.map