import { type GoogleCompanionClientCredentials, type GoogleCompanionConfiguredCredentials, type GoogleCompanionPresence } from "./google-companion-credentials.js";
export type GeminiCliCompanionPresence = GoogleCompanionPresence;
export type GeminiCliConfiguredCredentials = GoogleCompanionConfiguredCredentials;
export type GeminiCliClientCredentials = GoogleCompanionClientCredentials;
export declare function inspectGeminiCliCompanionPresence(): Promise<GeminiCliCompanionPresence>;
export declare function resolveGeminiCliClientCredentials(): Promise<GeminiCliClientCredentials>;
export declare function clearGeminiCliCompanionCacheForTests(): void;
//# sourceMappingURL=google-gemini-cli-companion.d.ts.map