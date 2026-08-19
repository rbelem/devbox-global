import type { ConfigFileFormat, EditableConfigPath } from "./config-file-utils.js";
export interface ManagedConfigComment {
    path: (string | number)[];
    text: string;
}
export interface ManagedConfigCommentReplacement {
    from: string;
    to: string;
}
export interface ConfigDocumentEdit {
    path: string;
    sourcePath: string;
    removeSourcePath?: string;
    format: ConfigFileFormat;
    originalBytes: Buffer | null;
    targetOriginalBytes: Buffer | null;
    updated: string;
    changed: boolean;
}
export declare class ConfigDocumentError extends Error {
    readonly path: string;
    constructor(message: string, path: string);
}
export declare function parseConfigDocument(raw: string, format: ConfigFileFormat, path: string): Record<string, unknown>;
export declare function editConfigDocumentPaths(params: {
    raw: string;
    format: ConfigFileFormat;
    path: string;
    edits: Array<{
        path: (string | number)[];
        value: unknown;
    }>;
}): string;
export declare function editConfigDocument(params: {
    raw: string;
    sourceFormat: ConfigFileFormat;
    outputFormat: ConfigFileFormat;
    path: string;
    desiredData: Record<string, unknown>;
    managedComments?: ManagedConfigComment[];
    managedCommentReplacements?: ManagedConfigCommentReplacement[];
}): string;
export declare function planConfigDocumentEdit(params: {
    target: EditableConfigPath;
    desiredData: Record<string, unknown>;
    managedComments?: ManagedConfigComment[];
    managedCommentReplacements?: ManagedConfigCommentReplacement[];
}): Promise<ConfigDocumentEdit>;
export declare function validateConfigDocumentEdit(edit: ConfigDocumentEdit, options?: {
    readBytes?: (path: string) => Promise<Buffer>;
    pathExists?: (path: string) => boolean;
}): Promise<void>;
export declare function applyConfigDocumentEdit(edit: ConfigDocumentEdit, options?: {
    readBytes?: (path: string) => Promise<Buffer>;
    pathExists?: (path: string) => boolean;
    writeText?: (path: string, content: string) => Promise<void>;
    removePath?: (path: string) => Promise<void>;
}): Promise<void>;
//# sourceMappingURL=opencode-config-editor.d.ts.map