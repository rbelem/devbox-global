import type { PercentDisplayMode } from "./types.js";
type PanelStatus = "loading" | "disabled" | "ready";
export type SidebarPanelState = {
    status: PanelStatus;
    lines: string[];
    linesExpanded?: string[];
    providerCount?: number;
};
export type CompactStatusState = {
    status: "loading";
    text?: string;
} | {
    status: "disabled";
    text?: string;
} | {
    status: "ready";
    text: string;
};
export type HomeBottomState = {
    status: "loading";
    announcementText?: string;
    compact: CompactStatusState;
} | {
    status: "disabled";
    announcementText?: string;
    compact: CompactStatusState;
} | {
    status: "ready";
    announcementText?: string;
    compact: CompactStatusState;
};
export type PromptBarEntry = {
    label?: string;
    name?: string;
    percentRemaining?: number;
    resetTimeIso?: string;
};
export type PromptBarState = {
    status: "loading" | "disabled";
} | {
    status: "ready";
    entry?: PromptBarEntry;
    percentDisplayMode?: PercentDisplayMode;
    resetTimeDecimals?: number;
};
export declare function shouldRenderSidebarPanel(panel: SidebarPanelState): boolean;
export declare function getSidebarPanelLines(panel: SidebarPanelState): string[];
export declare function getSidebarPanelLinesExpanded(panel: SidebarPanelState): string[];
export declare function shouldRenderCompactStatus(panel: CompactStatusState): boolean;
export declare function getCompactStatusText(panel: CompactStatusState): string;
export declare function shouldRenderHomeBottom(panel: HomeBottomState): boolean;
export declare function getHomeBottomAnnouncementText(panel: HomeBottomState): string;
export {};
//# sourceMappingURL=tui-panel-state.d.ts.map