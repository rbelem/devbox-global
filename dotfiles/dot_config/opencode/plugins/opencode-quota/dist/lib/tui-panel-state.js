import { sanitizeSingleLineDisplayText } from "./display-sanitize.js";
const SIDEBAR_LOADING_LINE = "Loading…";
const SIDEBAR_UNAVAILABLE_LINE = "Unavailable";
const COMPACT_LOADING_TEXT = "Quota loading…";
export function shouldRenderSidebarPanel(panel) {
    return panel.status !== "disabled";
}
export function getSidebarPanelLines(panel) {
    if (panel.lines.length > 0)
        return panel.lines;
    switch (panel.status) {
        case "ready":
            return [SIDEBAR_UNAVAILABLE_LINE];
        case "loading":
            return [SIDEBAR_LOADING_LINE];
        default:
            return [];
    }
}
export function getSidebarPanelLinesExpanded(panel) {
    if (panel.linesExpanded && panel.linesExpanded.length > 0)
        return panel.linesExpanded;
    return getSidebarPanelLines(panel);
}
export function shouldRenderCompactStatus(panel) {
    return panel.status !== "disabled";
}
export function getCompactStatusText(panel) {
    if (panel.status === "disabled")
        return "";
    const text = sanitizeSingleLineDisplayText(panel.text ?? "");
    if (text)
        return text;
    return panel.status === "loading" ? COMPACT_LOADING_TEXT : "";
}
export function shouldRenderHomeBottom(panel) {
    return Boolean(getHomeBottomAnnouncementText(panel) || shouldRenderCompactStatus(panel.compact));
}
export function getHomeBottomAnnouncementText(panel) {
    return sanitizeSingleLineDisplayText(panel.announcementText ?? "");
}
//# sourceMappingURL=tui-panel-state.js.map