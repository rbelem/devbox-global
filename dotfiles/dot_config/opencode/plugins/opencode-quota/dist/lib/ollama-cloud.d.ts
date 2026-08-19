/**
 * Ollama Cloud usage API client.
 *
 * Fetches session and weekly usage fractions plus per-model request counts
 * from the authenticated Ollama Cloud usage endpoint.
 */
import type { OllamaCloudResult } from "./types.js";
declare function parseOllamaCloudUsage(payload: unknown): OllamaCloudResult;
export declare function queryOllamaCloudQuota(options?: {
    requestTimeoutMs?: number;
}): Promise<OllamaCloudResult>;
export { parseOllamaCloudUsage as _parseOllamaCloudUsage };
//# sourceMappingURL=ollama-cloud.d.ts.map