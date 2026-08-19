export const SINGLE_WINDOW_PER_PROVIDER_FORMAT_STYLE = "singleWindow";
export const ALL_WINDOWS_FORMAT_STYLE = "allWindows";
export const DEFAULT_QUOTA_FORMAT_STYLE = SINGLE_WINDOW_PER_PROVIDER_FORMAT_STYLE;
const QUOTA_FORMAT_STYLE_DEFINITIONS = {
    [SINGLE_WINDOW_PER_PROVIDER_FORMAT_STYLE]: {
        id: SINGLE_WINDOW_PER_PROVIDER_FORMAT_STYLE,
        aliases: [SINGLE_WINDOW_PER_PROVIDER_FORMAT_STYLE, "classic"],
        label: "Single window",
        projection: "singleWindowPerProvider",
        renderer: "classic",
        sessionTokens: "summary",
    },
    [ALL_WINDOWS_FORMAT_STYLE]: {
        id: ALL_WINDOWS_FORMAT_STYLE,
        aliases: [ALL_WINDOWS_FORMAT_STYLE, "grouped"],
        label: "All windows",
        projection: "allWindows",
        renderer: "grouped",
        sessionTokens: "detailed",
    },
};
const QUOTA_FORMAT_STYLE_ALIAS_MAP = new Map(Object.values(QUOTA_FORMAT_STYLE_DEFINITIONS).flatMap((definition) => definition.aliases.map((alias) => [alias, definition.id])));
export function isQuotaFormatStyle(value) {
    return typeof value === "string" && QUOTA_FORMAT_STYLE_ALIAS_MAP.has(value);
}
export function resolveQuotaFormatStyle(value) {
    if (!isQuotaFormatStyle(value)) {
        return DEFAULT_QUOTA_FORMAT_STYLE;
    }
    return QUOTA_FORMAT_STYLE_ALIAS_MAP.get(value);
}
export function getQuotaFormatStyleDefinition(value) {
    return QUOTA_FORMAT_STYLE_DEFINITIONS[resolveQuotaFormatStyle(value)];
}
export function getQuotaFormatStyleLabel(value) {
    return getQuotaFormatStyleDefinition(value).label;
}
//# sourceMappingURL=quota-format-style.js.map