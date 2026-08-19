/**
 * Shared display sanitization for user-visible output.
 *
 * Strips ANSI escape sequences and other control characters so that
 * remote/provider error text cannot inject terminal control codes into
 * toasts or transcript output.
 */
import type { QuotaProviderResult, QuotaToastEntry, QuotaToastError, SessionTokensData } from "./entries.js";
import type { QuotaRenderData } from "./quota-render-data.js";
export declare function sanitizeDisplayText(text: string): string;
export declare function sanitizeSingleLineDisplayText(text: string): string;
export declare function sanitizeDisplaySnippet(text: string, maxLength: number): string;
export declare function sanitizeSingleLineDisplaySnippet(text: string, maxLength: number): string;
export declare function sanitizeOptionalDisplayText(value?: string): string | undefined;
export declare function sanitizeQuotaToastEntry(entry: QuotaToastEntry): QuotaToastEntry;
export declare function sanitizeQuotaToastError(error: QuotaToastError): QuotaToastError;
export declare function sanitizeQuotaProviderResult(result: QuotaProviderResult): QuotaProviderResult;
export declare function sanitizeSessionTokensData(data?: SessionTokensData): SessionTokensData | undefined;
export declare function sanitizeQuotaRenderData(data: QuotaRenderData): QuotaRenderData;
//# sourceMappingURL=display-sanitize.d.ts.map