import type { ObservableResult } from "@opentelemetry/api";
import type { QuotaProviderResult } from "./entries.js";
type ObservableCallback = (result: ObservableResult) => void;
type ObservableGauge = {
    addCallback(callback: ObservableCallback): void;
    removeCallback?(callback: ObservableCallback): void;
};
type TelemetryApi = {
    metrics: {
        getMeter(name: string): {
            createObservableGauge(name: string, options: {
                description: string;
                unit: string;
            }): ObservableGauge;
        };
    };
};
type TelemetryApiLoader = () => Promise<TelemetryApi>;
export interface QuotaTelemetryToken {
    readonly ownerId: number;
    readonly generation: number;
}
export declare function configureQuotaTelemetry(params: {
    owner: object;
    enabled: boolean;
    identity: string;
}): QuotaTelemetryToken | undefined;
export declare function disposeQuotaTelemetryOwner(ownerKey: object): void;
export declare function updateQuotaTelemetrySnapshot(params: {
    token?: QuotaTelemetryToken;
    snapshotId: string;
    supersededSnapshotIds?: readonly string[];
    providerId: string;
    cacheTimestamp?: number;
    result: QuotaProviderResult | null;
}): void;
export declare function retainQuotaTelemetryProviders(params: {
    token?: QuotaTelemetryToken;
    providerIds: readonly string[];
}): void;
export declare function __flushQuotaTelemetryInitializationForTests(): Promise<void>;
export declare function __setQuotaTelemetryApiLoaderForTests(loader: TelemetryApiLoader): void;
export declare function __resetQuotaTelemetryForTests(): void;
export {};
//# sourceMappingURL=quota-telemetry.d.ts.map