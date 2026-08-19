import { formatGroupedHeader } from "./grouped-header-format.js";
export function normalizeSingleWindowLabelText(value) {
    return value?.trim().replace(/:+$/u, "").trim() ?? "";
}
export function classifyQuotaWindowText(text) {
    const lower = normalizeSingleWindowLabelText(text).toLowerCase();
    if (!lower)
        return null;
    if (/\b(?:rpm|per minute|minute|minutes)\b/u.test(lower))
        return "rpm";
    if (/\b(?:rolling|5h|5 h|5-hour|5 hour|five-hour|five hour)\b/u.test(lower)) {
        return "five_hour";
    }
    if (/\b(?:hourly|1h|1 h|1-hour|1 hour|hour)\b/u.test(lower))
        return "hour";
    if (/\b(?:7d|7 d|7-day|7 day|weekly|week)\b/u.test(lower))
        return "week";
    if (/\b(?:daily|1d|1 d|1-day|1 day|day)\b/u.test(lower))
        return "day";
    if (/\b(?:monthly|month)\b/u.test(lower))
        return "month";
    if (/\b(?:yearly|annual|annually|year)\b/u.test(lower))
        return "year";
    if (/\bmcp\b/u.test(lower))
        return "mcp";
    if (/\bcode review\b/u.test(lower))
        return "code_review";
    return null;
}
const SINGLE_WINDOW_LABELS = {
    rpm: "RPM",
    five_hour: "5h",
    hour: "Hourly",
    week: "Weekly",
    day: "Daily",
    month: "Monthly",
    year: "Yearly",
    mcp: "MCP",
};
export function extractSingleWindowWindowLabel(text) {
    const kind = classifyQuotaWindowText(text);
    return kind ? (SINGLE_WINDOW_LABELS[kind] ?? null) : null;
}
export function buildSingleWindowPercentEntryDisplayName(entry) {
    const name = entry.name.trim();
    const group = entry.group?.trim();
    const windowLabel = extractSingleWindowWindowLabel(entry.label ?? "") ?? extractSingleWindowWindowLabel(entry.name);
    if (name.startsWith("[")) {
        if (!windowLabel)
            return name;
        return name.toLowerCase().includes(windowLabel.toLowerCase()) ? name : `${name} ${windowLabel}`;
    }
    if (group) {
        const provider = formatGroupedHeader(group);
        return windowLabel ? `${provider} ${windowLabel}` : provider;
    }
    return name;
}
//# sourceMappingURL=quota-entry-display.js.map