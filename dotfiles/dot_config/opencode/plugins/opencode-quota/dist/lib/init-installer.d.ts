import { type ConfigFileFormat } from "./config-file-utils.js";
import { type ConfigDocumentEdit } from "./opencode-config-editor.js";
import { type CanonicalQuotaFormatStyle } from "./quota-format-style.js";
import type { QuotaToastConfig, SessionTokenScope, TuiCommandDisplay } from "./types.js";
export type InitInstallerInterface = "tui" | "web" | "both";
export type InitInstallerScope = "project" | "global";
export type InitQuotaUiChoice = "toast" | "sidebar" | "compact_status" | "none";
export type InitQuotaUi = readonly InitQuotaUiChoice[];
export type InitProviderMode = "auto" | "manual";
export interface InitInstallerSelections {
    interfaces: InitInstallerInterface;
    scope: InitInstallerScope;
    quotaUi: InitQuotaUi;
    providerMode: InitProviderMode;
    manualProviders: string[];
    formatStyle: CanonicalQuotaFormatStyle;
    percentDisplayMode: QuotaToastConfig["percentDisplayMode"];
    showSessionTokens: boolean;
    sessionTokenScope?: SessionTokenScope;
    tuiCommandDisplay?: TuiCommandDisplay;
    maintainerAnnouncements?: boolean;
    configFormat?: ConfigFileFormat;
}
export interface InitInstallerQuickSetupNote {
    providerId: string;
    label: string;
    anchor: string;
}
export interface PlannedConfigEdit {
    kind: "opencode" | "tui" | "quota";
    path: string;
    existed: boolean;
    format: ConfigFileFormat;
    changed: boolean;
    addedPlugins: string[];
    addedKeys: string[];
    updatedKeys: string[];
    valueChanges: string[];
    skippedValues: string[];
    warnings: string[];
    nextData?: Record<string, unknown>;
    plannedData?: Record<string, unknown>;
    documentEdit?: ConfigDocumentEdit;
}
export interface InitInstallerPlan {
    selections: InitInstallerSelections;
    baseDir: string;
    edits: PlannedConfigEdit[];
    warnings: string[];
    quickSetupNotes: InitInstallerQuickSetupNote[];
    summaryLines: string[];
}
export interface ApplyInitInstallerPlanResult {
    writtenPaths: string[];
    unchangedPaths: string[];
}
export declare class InitInstallerError extends Error {
    readonly details?: {
        path?: string;
        writtenPaths?: string[];
    } | undefined;
    constructor(message: string, details?: {
        path?: string;
        writtenPaths?: string[];
    } | undefined);
}
type PromptOption = {
    label: string;
    value: string;
    hint?: string;
};
type PromptAdapter = {
    intro: (message: string) => void;
    outro: (message: string) => void;
    select: (options: {
        message: string;
        options: PromptOption[];
        initialValue?: string;
    }) => Promise<unknown>;
    multiselect: (options: {
        message: string;
        required?: boolean;
        options: PromptOption[];
        initialValues?: string[];
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
    };
};
export declare function getInstallerProviderPromptOptions(): PromptOption[];
export declare function resolveInitInstallerBaseDir(params: {
    scope: InitInstallerScope;
    cwd?: string;
    env?: NodeJS.ProcessEnv;
    homeDir?: string;
}): string;
export declare function planInitInstaller(params: {
    selections: InitInstallerSelections;
    cwd?: string;
    env?: NodeJS.ProcessEnv;
    homeDir?: string;
    syncLegacyConfig?: boolean;
}): Promise<InitInstallerPlan>;
export declare function applyInitInstallerPlan(plan: InitInstallerPlan): Promise<ApplyInitInstallerPlanResult>;
export declare function runInitInstaller(params?: {
    cwd?: string;
    env?: NodeJS.ProcessEnv;
    homeDir?: string;
    prompts?: PromptAdapter;
    syncLegacyConfig?: boolean;
    dryRun?: boolean;
}): Promise<number>;
export {};
//# sourceMappingURL=init-installer.d.ts.map