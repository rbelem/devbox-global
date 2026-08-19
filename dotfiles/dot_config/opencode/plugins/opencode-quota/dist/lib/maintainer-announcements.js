import { getQuotaProviderShape, normalizeQuotaProviderId, } from "./provider-metadata.js";
export const BUNDLED_MAINTAINER_ANNOUNCEMENTS = [
    {
        id: "opencode-ecosystem-listing-support",
        message: "Support OpenCode Quota's ecosystem listing: review the issue and add a thumbs-up.",
        url: "https://github.com/anomalyco/opencode/issues/38281",
        startsAt: "2026-07-22T00:00:00.000Z",
        endsAt: "2026-08-22T00:00:00.000Z",
    },
    {
        id: "google-gemini-cli-deprecated",
        message: "Gemini CLI quota support in OpenCode Quota is deprecated, with removal planned for v5.0.0. Existing v4 configurations continue to work. Google's official Antigravity CLI replaces the individual Gemini CLI experience. Google AI Studio or Vertex AI are the supported choices for third-party access. OpenCode Quota's Google integrations are independent and are not endorsed by Google.",
        providerIds: ["google-gemini-cli"],
    },
];
function parseTimestamp(value) {
    if (value === undefined) {
        return undefined;
    }
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : undefined;
}
function normalizedProviderIds(providerIds) {
    const out = [];
    const seen = new Set();
    for (const providerId of providerIds) {
        const shape = getQuotaProviderShape(normalizeQuotaProviderId(providerId));
        if (!shape || seen.has(shape.id)) {
            continue;
        }
        seen.add(shape.id);
        out.push(shape.id);
    }
    return out;
}
export function getMaintainerAnnouncementTargetProviderIds(params) {
    const out = [];
    const seen = new Set();
    for (const announcement of params?.announcements ?? BUNDLED_MAINTAINER_ANNOUNCEMENTS) {
        for (const providerId of normalizedProviderIds(announcement.providerIds ?? [])) {
            if (seen.has(providerId))
                continue;
            seen.add(providerId);
            out.push(providerId);
        }
    }
    return out;
}
function isHttpsUrl(value) {
    if (typeof value !== "string") {
        return false;
    }
    try {
        return new URL(value).protocol === "https:";
    }
    catch {
        return false;
    }
}
function getEndsAtSortValue(announcement) {
    return parseTimestamp(announcement.endsAt) ?? Number.POSITIVE_INFINITY;
}
export function evaluateMaintainerAnnouncements(params) {
    const nowMs = params?.nowMs ?? Date.now();
    const enabledProviders = params?.enabledProviders ?? "auto";
    // "auto" is unresolved provider scope here; provider-targeted announcements require
    // callers to pass concrete detected provider IDs.
    const concreteEnabledProviderIds = enabledProviders === "auto" ? [] : normalizedProviderIds(enabledProviders);
    return [...(params?.announcements ?? BUNDLED_MAINTAINER_ANNOUNCEMENTS)]
        .map((announcement) => {
        const reasons = [];
        if (!announcement.id.trim())
            reasons.push("invalid_id");
        if (!announcement.message.trim())
            reasons.push("invalid_message");
        if (announcement.url !== undefined && !isHttpsUrl(announcement.url))
            reasons.push("invalid_url");
        const startsAtMs = parseTimestamp(announcement.startsAt);
        const endsAtMs = parseTimestamp(announcement.endsAt);
        if (announcement.startsAt !== undefined && startsAtMs === undefined)
            reasons.push("invalid_starts_at");
        if (announcement.endsAt !== undefined && endsAtMs === undefined)
            reasons.push("invalid_ends_at");
        if (startsAtMs !== undefined && startsAtMs > nowMs)
            reasons.push("not_started");
        if (endsAtMs !== undefined && endsAtMs <= nowMs)
            reasons.push("ended");
        const providerIds = announcement.providerIds;
        const announcementProviderIds = normalizedProviderIds(providerIds ?? []);
        if (providerIds && announcementProviderIds.length === 0) {
            reasons.push("invalid_provider_ids");
        }
        else if (announcementProviderIds.length > 0) {
            const enabledProviderSet = new Set(concreteEnabledProviderIds);
            if (!announcementProviderIds.some((providerId) => enabledProviderSet.has(providerId))) {
                reasons.push("provider_mismatch");
            }
        }
        return {
            announcement,
            active: reasons.length === 0,
            reasons,
        };
    })
        .sort((a, b) => {
        if (a.active !== b.active)
            return a.active ? -1 : 1;
        const endsAtDelta = getEndsAtSortValue(a.announcement) - getEndsAtSortValue(b.announcement);
        if (endsAtDelta !== 0)
            return endsAtDelta;
        return a.announcement.id.localeCompare(b.announcement.id);
    });
}
export function getActiveMaintainerAnnouncements(params) {
    return evaluateMaintainerAnnouncements(params).filter((evaluation) => evaluation.active);
}
export function getMaintainerAnnouncementsSummary(params) {
    const announcements = params?.announcements ?? BUNDLED_MAINTAINER_ANNOUNCEMENTS;
    const evaluations = evaluateMaintainerAnnouncements({ ...params, announcements });
    const activeAnnouncements = evaluations.filter((evaluation) => evaluation.active);
    return {
        source: "bundled_only",
        network: false,
        bundledCount: announcements.length,
        activeCount: activeAnnouncements.length,
        futureCount: evaluations.filter((evaluation) => evaluation.reasons.includes("not_started"))
            .length,
        expiredCount: evaluations.filter((evaluation) => evaluation.reasons.includes("ended")).length,
        activeAnnouncements,
        evaluations,
    };
}
export function formatMaintainerAnnouncementHomeCountLine(activeCount) {
    if (activeCount <= 0)
        return "";
    if (activeCount === 1) {
        return "Notice: Maintainer announcement available. Run /quota_announcements.";
    }
    return `Notice: ${activeCount} maintainer announcements available. Run /quota_announcements.`;
}
//# sourceMappingURL=maintainer-announcements.js.map