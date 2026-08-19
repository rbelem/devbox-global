type PromptAdapter = {
    intro: (message: string) => void;
    outro: (message: string) => void;
    select: (options: {
        message: string;
        options: Array<{
            label: string;
            value: string;
            hint?: string;
        }>;
        initialValue?: string;
    }) => Promise<unknown>;
    text: (options: {
        message: string;
        placeholder?: string;
        initialValue?: string;
    }) => Promise<unknown>;
    confirm: (options: {
        message: string;
        initialValue?: boolean;
    }) => Promise<unknown>;
    isCancel: (value: unknown) => boolean;
    log: {
        info: (message: string) => void;
        success: (message: string) => void;
        error: (message: string) => void;
        warn?: (message: string) => void;
    };
};
export declare function runProviderAddCommand(params?: {
    argv?: string[];
    prompts?: PromptAdapter;
}): Promise<number>;
export {};
//# sourceMappingURL=provider-add-command.d.ts.map