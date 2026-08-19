export async function mapWithConcurrency(values, concurrency, map) {
    const results = new Array(values.length);
    let nextIndex = 0;
    async function worker() {
        while (true) {
            const index = nextIndex;
            nextIndex += 1;
            if (index >= values.length)
                return;
            results[index] = await map(values[index], index);
        }
    }
    const workerCount = Math.min(values.length, Math.max(1, Math.trunc(concurrency) || 1));
    await Promise.all(Array.from({ length: workerCount }, () => worker()));
    return results;
}
//# sourceMappingURL=map-with-concurrency.js.map