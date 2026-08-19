import type { AccountingMetadata, QuotaProviderPresentation, QuotaProviderResult, QuotaProviderStatusDetail, QuotaToastEntry, QuotaToastError } from "../lib/entries.js";
export declare function notAttemptedResult(): QuotaProviderResult;
export declare function attemptedResult(entries: QuotaToastEntry[], errors?: QuotaToastError[], presentation?: QuotaProviderPresentation): QuotaProviderResult;
export declare function attemptedErrorResult(label: string, message: string): QuotaProviderResult;
export declare function statusDetailsFromRecord(values: Readonly<Record<string, string | undefined>>): QuotaProviderStatusDetail[];
export declare function configStatusDetails(diagnostics: {
    state: string;
    source: string | null;
    checkedPaths: readonly string[];
    missing?: string | null;
    error?: string | null;
}): QuotaProviderStatusDetail[];
export declare function simpleApiKeyStatusDetails(diagnostics: {
    configured: boolean;
    source: string | null;
    checkedPaths: readonly string[];
    authPaths: readonly string[];
}): QuotaProviderStatusDetail[];
export declare function apiKeyStatusDetails(diagnostics: {
    state: string;
    source: string | null;
    checkedPaths: readonly string[];
    authPaths: readonly string[];
    error?: string;
}): QuotaProviderStatusDetail[];
export declare function withStatusDetails(result: QuotaProviderResult, statusDetails: readonly QuotaProviderStatusDetail[]): QuotaProviderResult;
export declare function inspectGeneratedCounterFile(path: string, expectedVersion: number): Promise<{
    exists: boolean;
    health: "missing" | "healthy" | "malformed" | "version_mismatch";
    version: number | null;
    lastUpdatedAt: number | null;
}>;
export declare function mapNullableProviderResult<TSuccess extends {
    success: true;
}>(result: TSuccess | {
    success: false;
    error: string;
} | null, params: {
    errorLabel: string;
    onSuccess: (result: TSuccess) => QuotaProviderResult;
}): QuotaProviderResult;
export declare function groupedPercentWindowEntries(params: {
    group: string;
    accounting: AccountingMetadata;
    windows: Array<{
        window?: {
            percentRemaining: number;
            resetTimeIso?: string;
        };
        suffix: string;
        label: string;
    }>;
    fallbackWhenEmpty?: boolean;
}): QuotaToastEntry[];
//# sourceMappingURL=result-helpers.d.ts.map