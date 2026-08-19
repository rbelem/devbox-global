/**
 * Normalize grouped provider headers so toast and /quota use the same title style.
 */
export function formatGroupedHeader(group) {
    const trimmed = group.trim();
    if (!trimmed)
        return "[]";
    if (trimmed.startsWith("["))
        return trimmed;
    const match = trimmed.match(/^([^()]+?)\s*(\(.+\))\s*$/);
    if (match) {
        return `[${match[1].trim()}] ${match[2].trim()}`;
    }
    return `[${trimmed}]`;
}
//# sourceMappingURL=grouped-header-format.js.map