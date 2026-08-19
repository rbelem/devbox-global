export declare const SINGLE_WINDOW_PER_PROVIDER_FORMAT_STYLE: "singleWindow";
export declare const ALL_WINDOWS_FORMAT_STYLE: "allWindows";
export declare const DEFAULT_QUOTA_FORMAT_STYLE: "singleWindow";
export type CanonicalQuotaFormatStyle = typeof SINGLE_WINDOW_PER_PROVIDER_FORMAT_STYLE | typeof ALL_WINDOWS_FORMAT_STYLE;
export type QuotaFormatStyle = CanonicalQuotaFormatStyle | "classic" | "grouped";
export type QuotaFormatProjection = "singleWindowPerProvider" | "allWindows";
export type QuotaFormatRenderer = "classic" | "grouped";
export type QuotaFormatSessionTokens = "summary" | "detailed";
export type QuotaFormatStyleDefinition = {
    id: CanonicalQuotaFormatStyle;
    aliases: readonly QuotaFormatStyle[];
    label: string;
    projection: QuotaFormatProjection;
    renderer: QuotaFormatRenderer;
    sessionTokens: QuotaFormatSessionTokens;
};
export declare function isQuotaFormatStyle(value: unknown): value is QuotaFormatStyle;
export declare function resolveQuotaFormatStyle(value: unknown): CanonicalQuotaFormatStyle;
export declare function getQuotaFormatStyleDefinition(value: unknown): QuotaFormatStyleDefinition;
export declare function getQuotaFormatStyleLabel(value: unknown): string;
//# sourceMappingURL=quota-format-style.d.ts.map