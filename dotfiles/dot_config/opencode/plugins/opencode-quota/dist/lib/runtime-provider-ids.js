export function createRuntimeProviderIdResolver(client) {
    let pending;
    return () => {
        pending ??= client.config
            .providers()
            .then((response) => new Set((response.data?.providers ?? []).map((provider) => provider.id)));
        return pending;
    };
}
//# sourceMappingURL=runtime-provider-ids.js.map