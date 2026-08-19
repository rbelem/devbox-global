export function isValueEntry(e) {
    return e.kind === "value";
}
export function isPercentEntry(e) {
    return !isValueEntry(e);
}
//# sourceMappingURL=entries.js.map