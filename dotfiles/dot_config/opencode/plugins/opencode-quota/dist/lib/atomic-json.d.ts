export interface WriteJsonAtomicOptions {
    trailingNewline?: boolean;
    directoryMode?: number;
    fileMode?: number;
}
export declare function writeJsonAtomic(path: string, data: unknown, opts?: WriteJsonAtomicOptions): Promise<void>;
export declare function writeTextAtomic(path: string, content: string, opts?: Omit<WriteJsonAtomicOptions, "trailingNewline">): Promise<void>;
//# sourceMappingURL=atomic-json.d.ts.map