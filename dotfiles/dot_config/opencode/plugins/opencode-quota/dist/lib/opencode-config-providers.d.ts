import { type ConfigFileFormat } from "./config-file-utils.js";
export interface LoadConfiguredProviderIdsOptions {
    configRootDir: string;
}
export interface ReconcileDetectedProviderConfigOptions {
    configRootDir: string;
    detectedProviderIds: readonly string[];
    preferredFormat?: ConfigFileFormat;
    writeText?: (path: string, content: string) => Promise<void>;
}
export interface ReconcileDetectedProviderConfigResult {
    path: string | null;
    format: ConfigFileFormat | null;
    addedProviderIds: string[];
    changed: boolean;
}
export declare function loadConfiguredOpenCodeConfig(options: LoadConfiguredProviderIdsOptions): Promise<Record<string, unknown>>;
export declare function loadConfiguredProviderIds(options: LoadConfiguredProviderIdsOptions): Promise<string[]>;
/**
 * Adds providers proven available at runtime to the global OpenCode config only.
 * Project declarations participate in the read/precedence check but are never written.
 */
export declare function reconcileDetectedProvidersInGlobalConfig(options: ReconcileDetectedProviderConfigOptions): Promise<ReconcileDetectedProviderConfigResult>;
//# sourceMappingURL=opencode-config-providers.d.ts.map