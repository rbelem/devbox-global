// wigolo as an OpenCode V2 websearch provider.
// Bridges the built-in websearch tool to the local wigolo daemon's MCP
// `search` tool (streamable HTTP, default http://127.0.0.1:3333/mcp).
//
// No imports: the supervisor decodes a bare {id, setup} default export and
// calls setup with its own context, so ctx.websearch.transform wraps our
// Promise execute with the service's own Effect.tryPromise — no foreign
// Effect instance (path-based loads get a ?mtime= query that breaks
// bare-import resolution anyway).
// ponytail: one cached MCP session with one re-init retry; node:http instead
// of global fetch; a failed search resolves [] instead of throwing.
//
// IMPORTANT: the WebSearch Result schema requires `time.published` (a finite
// number) for non-empty results — omitting it makes the core decoder reject
// the array with 503. wigolo returns no timestamp, so we synthesize 0.

const WIGOLO_MCP = process.env.WIGOLO_MCP_URL || "http://127.0.0.1:3333/mcp";

let sessionId = null;

function rpc(body, session) {
  return new Promise((resolve, reject) => {
    const http = require("node:http");
    const u = new URL(WIGOLO_MCP);
    const req = http.request(
      {
        hostname: u.hostname,
        port: u.port,
        path: u.pathname + u.search,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json, text/event-stream",
          ...(session ? { "Mcp-Session-Id": session } : {}),
        },
        timeout: 25_000,
      },
      (res) => {
        let data = "";
        res.setEncoding("utf8");
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          const sidRaw = res.headers["mcp-session-id"];
          const sid = Array.isArray(sidRaw) ? sidRaw[0] : sidRaw;
          if (sid) sessionId = sid;
          if ((res.statusCode ?? 500) >= 400) {
            reject(new Error(`wigolo MCP HTTP ${res.statusCode}`));
            return;
          }
          try {
            const payload = data.startsWith("{")
              ? data
              : data
                  .split("\n")
                  .filter((l) => l.startsWith("data: "))
                  .map((l) => l.slice(6))
                  .join("");
            const parsed = JSON.parse(payload);
            if (parsed.error) {
              reject(new Error(`wigolo MCP error: ${parsed.error.message ?? JSON.stringify(parsed.error)}`));
              return;
            }
            resolve(parsed.result);
          } catch (e) {
            reject(e);
          }
        });
      },
    );
    req.on("timeout", () => req.destroy(new Error("wigolo MCP timeout")));
    req.on("error", reject);
    req.end(JSON.stringify(body));
  });
}

const INIT = () =>
  rpc(
    {
      jsonrpc: "2.0",
      id: 0,
      method: "initialize",
      params: {
        protocolVersion: "2025-06-18",
        capabilities: {},
        clientInfo: { name: "opencode-wigolo-search", version: "0" },
      },
    },
    null,
  );

async function call(name, args) {
  if (!sessionId) await INIT();
  try {
    return await rpc({ jsonrpc: "2.0", id: Date.now(), method: "tools/call", params: { name, arguments: args } }, sessionId);
  } catch (e) {
    sessionId = null;
    await INIT();
    return await rpc({ jsonrpc: "2.0", id: Date.now(), method: "tools/call", params: { name, arguments: args } }, sessionId);
  }
}

async function doSearch(query) {
  const result = await call("search", { query, search_depth: "fast", max_results: 10 });
  const text = result?.content?.[0]?.text;
  if (!text) return [];
  const data = JSON.parse(text);
  const results = Array.isArray(data.results) ? data.results : [];
  return results
    .filter((r) => typeof r?.url === "string" && r.url.length > 0)
    .slice(0, 10)
    .map((r) => ({
      url: r.url,
      title: typeof r.title === "string" ? r.title : undefined,
      content: typeof r.snippet === "string" ? r.snippet : undefined,
      time: { published: 0 }, // wigolo gives no publish date; schema needs finite for non-empty
    }));
}

export default {
  id: "local.wigolo-search",
  setup: async (ctx) => {
    await ctx.websearch.transform((draft) => {
      draft.add({
        id: "wigolo",
        name: "wigolo (local, cached)",
        execute: (input) => doSearch(input.query).catch(() => []),
      });
      draft.default.set("wigolo");
    });
  },
};
