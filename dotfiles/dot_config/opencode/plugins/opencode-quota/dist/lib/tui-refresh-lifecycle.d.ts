export interface TuiRefreshLifecycle {
    reload: () => void;
    retain: () => void;
    release: () => void;
}
export interface TuiRefreshLifecycleOptions<T> {
    load: () => Promise<T>;
    apply: (value: T) => void;
    afterApply?: (value: T) => void;
    intervalMs: number;
    eventRefreshDelaysMs: readonly number[];
    recoveryDelaysMs?: readonly number[];
    subscribe: (scheduleRefresh: () => void) => Array<() => void>;
    onDispose: () => void;
}
export declare function createTuiRefreshLifecycle<T>(options: TuiRefreshLifecycleOptions<T>): TuiRefreshLifecycle;
//# sourceMappingURL=tui-refresh-lifecycle.d.ts.map