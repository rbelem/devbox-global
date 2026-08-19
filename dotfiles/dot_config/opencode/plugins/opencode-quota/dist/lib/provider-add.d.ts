import { type ConfigFileFormat } from "./config-file-utils.js";
import { type ConfigDocumentEdit } from "./opencode-config-editor.js";
import { type QuotaProviderDefinition } from "./quota-providers.js";
export interface ProviderAddPlan {
    path: string;
    format: ConfigFileFormat;
    definition: QuotaProviderDefinition;
    updated: string;
    changed: boolean;
    ordinaryProviderRequired: boolean;
    documentEdit: ConfigDocumentEdit;
    additionalDocumentEdits: ConfigDocumentEdit[];
}
export interface ProviderAddOptions {
    definition: unknown;
    configDir?: string;
    preferredFormat?: ConfigFileFormat;
}
export declare function planProviderAdd(options: ProviderAddOptions): Promise<ProviderAddPlan>;
export declare function applyProviderAddPlan(plan: ProviderAddPlan): Promise<void>;
//# sourceMappingURL=provider-add.d.ts.map