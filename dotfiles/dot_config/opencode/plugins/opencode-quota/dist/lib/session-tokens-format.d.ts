/**
 * Shared "Session input/output tokens" rendering block.
 *
 * Extracted from format.ts, toast-format-grouped.ts, and
 * quota-command-format.ts to eliminate verbatim duplication.
 */
import type { SessionTokensData } from "./entries.js";
export declare const WIDE_SESSION_TOKEN_LINE_WIDTH = 45;
export declare const SESSION_TOKEN_SECTION_HEADING = "Session input/output tokens";
export type SessionTokenSectionModel = {
    heading: string;
    lines: string[];
};
export declare function buildSessionTokenSectionModel(sessionTokens?: SessionTokensData, options?: {
    maxWidth?: number;
    variant?: "detailed" | "sidebar_summary";
}): SessionTokenSectionModel | null;
/**
 * Render the shared session input/output token section lines.
 *
 * Returns an empty array when there is no data to display.
 * Callers are responsible for inserting a leading blank line if needed.
 */
export declare function renderSessionTokensLines(sessionTokens?: SessionTokensData, options?: {
    maxWidth?: number;
}): string[];
/**
 * Render the sidebar-only aggregate session token summary lines.
 *
 * The TUI sidebar keeps the heading but switches to a single total summary line
 * so the fixed-width panel stays compact without dropping grouped/classic quota rows.
 */
export declare function renderSidebarSessionTokenSummaryLines(sessionTokens?: SessionTokensData, options?: {
    maxWidth?: number;
}): string[];
//# sourceMappingURL=session-tokens-format.d.ts.map