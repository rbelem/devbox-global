export interface RunCliStatusCommandOptions {
    argv?: string[];
    cwd?: string;
    stdout?: Pick<NodeJS.WriteStream, "write">;
    stderr?: Pick<NodeJS.WriteStream, "write">;
}
export declare function runCliStatusCommand(options?: RunCliStatusCommandOptions): Promise<number>;
//# sourceMappingURL=cli-status.d.ts.map