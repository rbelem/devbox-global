import type { QuotaRuntimeClient } from "./quota-runtime-context.js";
export interface RunCliShowCommandOptions {
    argv?: string[];
    cwd?: string;
    stdout?: Pick<NodeJS.WriteStream, "write">;
    stderr?: Pick<NodeJS.WriteStream, "write">;
}
export declare function resolveCliRoots(cwd: string): {
    workspaceRoot: string;
    configRoot: string;
    fallbackDirectory: string;
};
export declare function createCliQuotaClient(params: {
    configRootDir: string;
}): QuotaRuntimeClient;
export declare function runCliShowCommand(options?: RunCliShowCommandOptions): Promise<number>;
//# sourceMappingURL=cli-show.d.ts.map