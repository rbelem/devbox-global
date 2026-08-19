function trimOptional(value) {
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
}
function normalizeDurationText(value) {
    const trimmed = trimOptional(value);
    return trimmed?.replace(/:+$/u, "").trim().toLowerCase();
}
function looksLikeGoogleModel(name) {
    const lower = name.toLowerCase();
    return (lower === "claude" ||
        lower === "g3pro" ||
        lower === "g3flash" ||
        lower === "g3image" ||
        lower === "gpt-oss");
}
function getGoogleFallbackMeta(name) {
    const match = name.match(/^(.+?)\s*\((.+)\)\s*$/);
    if (!match)
        return undefined;
    const model = match[1].trim();
    const account = match[2].trim();
    if (!looksLikeGoogleModel(model) || !account)
        return undefined;
    return {
        group: `[Antigravity (${account})]`,
        label: `${model}:`,
    };
}
function getDurationRankFromText(value) {
    const text = normalizeDurationText(value);
    if (!text)
        return null;
    if (/\b(?:rpm|per minute|minute|minutes)\b/u.test(text))
        return 1;
    if (/\b(?:rolling|5h|5 h|5-hour|5 hour|five-hour|five hour)\b/u.test(text))
        return 300;
    if (/\b(?:hourly|1h|1 h|1-hour|1 hour|hour)\b/u.test(text))
        return 60;
    if (/\b(?:7d|7 d|7-day|7 day|weekly|week)\b/u.test(text))
        return 10080;
    if (/\b(?:daily|1d|1 d|1-day|1 day|day)\b/u.test(text))
        return 1440;
    if (/\b(?:monthly|month)\b/u.test(text))
        return 43200;
    if (/\b(?:yearly|annual|annually|year)\b/u.test(text))
        return 525600;
    return null;
}
function getDurationRank(entry) {
    if (Number.isFinite(entry.sortPriority))
        return entry.sortPriority;
    return entry.label ? getDurationRankFromText(entry.label) : getDurationRankFromText(entry.name);
}
function normalizeGroupedQuotaEntry(entry, target) {
    const group = trimOptional(entry.group);
    const label = trimOptional(entry.label);
    const right = trimOptional(entry.right);
    const normalized = {
        ...entry,
        ...(label ? { label } : {}),
        ...(right ? { right } : {}),
    };
    if (group) {
        return { ...normalized, group };
    }
    const googleFallback = getGoogleFallbackMeta(entry.name);
    if (googleFallback) {
        return {
            ...normalized,
            group: googleFallback.group,
            ...(label || target === "quota" ? { label: label ?? googleFallback.label } : {}),
        };
    }
    return {
        ...normalized,
        group: entry.name.trim(),
        ...(target === "quota" ? { label: label ?? "Status:" } : {}),
    };
}
export function groupQuotaEntries(entries, target) {
    const groupOrder = [];
    const groupedEntries = new Map();
    for (const [originalIndex, entry] of entries.entries()) {
        const normalizedEntry = normalizeGroupedQuotaEntry(entry, target);
        const rankedEntry = {
            entry: normalizedEntry,
            originalIndex,
            rank: getDurationRank(normalizedEntry),
        };
        const existing = groupedEntries.get(normalizedEntry.group);
        if (existing) {
            existing.push(rankedEntry);
            continue;
        }
        groupOrder.push(normalizedEntry.group);
        groupedEntries.set(normalizedEntry.group, [rankedEntry]);
    }
    return groupOrder.map((group) => {
        const rankedEntries = groupedEntries.get(group) ?? [];
        const entries = rankedEntries
            .slice()
            .sort((left, right) => {
            if (left.rank !== null && right.rank !== null && left.rank !== right.rank) {
                return left.rank - right.rank;
            }
            if (left.rank !== null && right.rank === null)
                return -1;
            if (left.rank === null && right.rank !== null)
                return 1;
            return left.originalIndex - right.originalIndex;
        })
            .map(({ entry }) => entry);
        return { group, entries };
    });
}
export function normalizeGroupedQuotaEntries(entries, target) {
    return groupQuotaEntries(entries, target).flatMap((group) => group.entries);
}
//# sourceMappingURL=grouped-entry-normalization.js.map