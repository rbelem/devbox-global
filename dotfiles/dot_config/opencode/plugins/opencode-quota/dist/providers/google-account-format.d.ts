import type { QuotaToastError } from "../lib/entries.js";
import type { GoogleAccountError } from "../lib/types.js";
export type GoogleAccountLabelStyle = "fixedGmailHint" | "domainHint";
export declare function formatGoogleAccountLabel(email: string | undefined, _style: GoogleAccountLabelStyle): string;
export declare function createGoogleAccountLabelMap(emails: readonly (string | undefined)[], style: GoogleAccountLabelStyle): ReadonlyMap<string, string>;
export declare function formatGoogleAccountErrors(errors: readonly GoogleAccountError[] | undefined, style: GoogleAccountLabelStyle, labels?: ReadonlyMap<string, string>): QuotaToastError[];
//# sourceMappingURL=google-account-format.d.ts.map