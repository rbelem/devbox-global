/**
 * Shared display sanitization for user-visible output.
 *
 * Strips ANSI escape sequences and other control characters so that
 * remote/provider error text cannot inject terminal control codes into
 * toasts or transcript output.
 */
import { isValueEntry } from "./entries.js";
// Remove terminal escape sequences (CSI/OSC/DCS/APC/PM/SOS) and other control
// characters except newline/tab so provider text cannot inject terminal actions.
// eslint-disable-next-line no-control-regex
const DISPLAY_ESCAPE_SEQUENCE_RE = /\x1B(?:\[[0-?]*[ -/]*[@-~]|\][^\x1B\u0007]*(?:\u0007|\x1B\\)|P[\s\S]*?\x1B\\|_[\s\S]*?\x1B\\|\^[\s\S]*?\x1B\\|X[\s\S]*?\x1B\\|[@-_])/g;
// eslint-disable-next-line no-control-regex
const DISPLAY_CONTROL_RE = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g;
export function sanitizeDisplayText(text) {
    return text.replace(DISPLAY_ESCAPE_SEQUENCE_RE, "").replace(DISPLAY_CONTROL_RE, "");
}
export function sanitizeSingleLineDisplayText(text) {
    return sanitizeDisplayText(text).replace(/\s+/gu, " ").trim();
}
export function sanitizeDisplaySnippet(text, maxLength) {
    return sanitizeDisplayText(text).slice(0, maxLength);
}
export function sanitizeSingleLineDisplaySnippet(text, maxLength) {
    return sanitizeSingleLineDisplayText(text).slice(0, maxLength);
}
export function sanitizeOptionalDisplayText(value) {
    return typeof value === "string" ? sanitizeDisplayText(value) : undefined;
}
export function sanitizeQuotaToastEntry(entry) {
    if (isValueEntry(entry)) {
        return {
            ...entry,
            accounting: { ...entry.accounting },
            name: sanitizeDisplayText(entry.name),
            value: sanitizeDisplayText(entry.value),
            group: sanitizeOptionalDisplayText(entry.group),
            label: sanitizeOptionalDisplayText(entry.label),
            right: sanitizeOptionalDisplayText(entry.right),
            resetTimeIso: sanitizeOptionalDisplayText(entry.resetTimeIso),
        };
    }
    return {
        ...entry,
        accounting: { ...entry.accounting },
        name: sanitizeDisplayText(entry.name),
        group: sanitizeOptionalDisplayText(entry.group),
        label: sanitizeOptionalDisplayText(entry.label),
        right: sanitizeOptionalDisplayText(entry.right),
        resetTimeIso: sanitizeOptionalDisplayText(entry.resetTimeIso),
    };
}
export function sanitizeQuotaToastError(error) {
    return {
        label: sanitizeDisplayText(error.label),
        message: sanitizeDisplayText(error.message),
        ...(error.kind ? { kind: error.kind } : {}),
    };
}
export function sanitizeQuotaProviderResult(result) {
    return {
        attempted: result.attempted,
        entries: result.entries.map(sanitizeQuotaToastEntry),
        errors: result.errors.map(sanitizeQuotaToastError),
        ...(result.diagnostics
            ? {
                diagnostics: result.diagnostics.map((diagnostic) => ({
                    ...diagnostic,
                    modelIds: diagnostic.modelIds ? [...diagnostic.modelIds] : null,
                    checkedPaths: [...diagnostic.checkedPaths],
                    authPaths: [...diagnostic.authPaths],
                })),
            }
            : {}),
        ...(result.statusDetails
            ? {
                statusDetails: result.statusDetails.map((detail) => ({
                    key: sanitizeDisplayText(detail.key),
                    value: sanitizeDisplayText(detail.value),
                })),
            }
            : {}),
        ...(result.rawDetails
            ? {
                rawDetails: result.rawDetails.map((detail) => ({
                    key: sanitizeDisplayText(detail.key),
                    value: sanitizeDisplayText(detail.value),
                })),
            }
            : {}),
        ...(result.presentation ? { presentation: { ...result.presentation } } : {}),
    };
}
export function sanitizeSessionTokensData(data) {
    if (!data)
        return undefined;
    return {
        ...data,
        models: data.models.map((model) => ({
            ...model,
            modelID: sanitizeDisplayText(model.modelID),
        })),
    };
}
export function sanitizeQuotaRenderData(data) {
    return {
        entries: data.entries.map(sanitizeQuotaToastEntry),
        errors: data.errors.map(sanitizeQuotaToastError),
        sessionTokens: sanitizeSessionTokensData(data.sessionTokens),
    };
}
//# sourceMappingURL=display-sanitize.js.map