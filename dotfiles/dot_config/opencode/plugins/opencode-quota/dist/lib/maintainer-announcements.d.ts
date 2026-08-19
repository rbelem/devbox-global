import { type CanonicalQuotaProviderId } from "./provider-metadata.js";
export interface MaintainerAnnouncement {
    id: string;
    message: string;
    url?: string;
    startsAt?: string;
    endsAt?: string;
    providerIds?: CanonicalQuotaProviderId[];
}
export type MaintainerAnnouncementInactiveReason = "invalid_id" | "invalid_message" | "invalid_url" | "invalid_starts_at" | "invalid_ends_at" | "not_started" | "ended" | "invalid_provider_ids" | "provider_mismatch";
export interface MaintainerAnnouncementEvaluation {
    announcement: MaintainerAnnouncement;
    active: boolean;
    reasons: MaintainerAnnouncementInactiveReason[];
}
export interface MaintainerAnnouncementsSummary {
    source: "bundled_only";
    network: false;
    bundledCount: number;
    activeCount: number;
    futureCount: number;
    expiredCount: number;
    activeAnnouncements: MaintainerAnnouncementEvaluation[];
    evaluations: MaintainerAnnouncementEvaluation[];
}
export declare const BUNDLED_MAINTAINER_ANNOUNCEMENTS: readonly MaintainerAnnouncement[];
export declare function getMaintainerAnnouncementTargetProviderIds(params?: {
    announcements?: readonly MaintainerAnnouncement[];
}): CanonicalQuotaProviderId[];
export declare function evaluateMaintainerAnnouncements(params?: {
    announcements?: readonly MaintainerAnnouncement[];
    nowMs?: number;
    enabledProviders?: string[] | "auto";
}): MaintainerAnnouncementEvaluation[];
export declare function getActiveMaintainerAnnouncements(params?: {
    announcements?: readonly MaintainerAnnouncement[];
    nowMs?: number;
    enabledProviders?: string[] | "auto";
}): MaintainerAnnouncementEvaluation[];
export declare function getMaintainerAnnouncementsSummary(params?: {
    announcements?: readonly MaintainerAnnouncement[];
    nowMs?: number;
    enabledProviders?: string[] | "auto";
}): MaintainerAnnouncementsSummary;
export declare function formatMaintainerAnnouncementHomeCountLine(activeCount: number): string;
//# sourceMappingURL=maintainer-announcements.d.ts.map