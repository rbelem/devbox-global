import { SESSION_TOKEN_SECTION_HEADING } from "./session-tokens-format.js";
export function getSidebarBodyLineColor(line, theme) {
    return line.length > 0 && SESSION_TOKEN_SECTION_HEADING.startsWith(line)
        ? theme.text
        : theme.textMuted;
}
//# sourceMappingURL=tui-line-style.js.map