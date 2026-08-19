import { type GoogleCompanionClientCredentials, type GoogleCompanionConfiguredCredentials, type GoogleCompanionPresence } from "./google-companion-credentials.js";
export type AgyCompanionPresence = GoogleCompanionPresence;
export type AgyConfiguredCredentials = GoogleCompanionConfiguredCredentials;
export type AgyClientCredentials = GoogleCompanionClientCredentials;
export declare function inspectAgyCompanionPresence(): Promise<AgyCompanionPresence>;
export declare function resolveAgyClientCredentials(): Promise<AgyClientCredentials>;
export declare function clearAgyCompanionCacheForTests(): void;
//# sourceMappingURL=google-agy-companion.d.ts.map