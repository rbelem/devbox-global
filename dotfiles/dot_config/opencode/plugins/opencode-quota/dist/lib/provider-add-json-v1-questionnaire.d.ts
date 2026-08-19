import { type JsonV1Adapter } from "./quota-providers.js";
type PromptOption<T extends string> = {
    label: string;
    value: T;
    hint?: string;
};
export interface JsonV1QuestionnairePrompts {
    select: (options: {
        message: string;
        options: Array<PromptOption<string>>;
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
}
export type JsonV1QuestionnaireResult = {
    state: "complete";
    adapter: JsonV1Adapter;
} | {
    state: "cancelled";
};
export declare function promptJsonV1Adapter(prompts: JsonV1QuestionnairePrompts): Promise<JsonV1QuestionnaireResult>;
export {};
//# sourceMappingURL=provider-add-json-v1-questionnaire.d.ts.map