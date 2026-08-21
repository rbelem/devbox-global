// wigolo as an OpenCode V2 web provider.
// Bridges the built-in websearch tool to the local wigolo daemon's MCP
// `search` tool (streamable HTTP, default http://127.0.0.1:3333/mcp), and
// overrides the built-in webfetch tool with wigolo's `fetch` (cached,
// JS-rendered, anti-bot). The registry seeds built-ins first and lets later
// registrations win by name, so adding a tool named "webfetch" replaces the
// stock one wholesale (same input/output schema, so prompts don't change).
//
// No package imports (node builtins only): the supervisor decodes a bare
// {id, setup} default export and calls setup with its own context, so
// ctx.*.transform wraps our Promise execute with the service's own
// Effect.tryPromise — no foreign Effect instance (path-based loads get a
// ?mtime= query that breaks bare-import resolution anyway).
// ponytail: one cached MCP session with one re-init retry (skipped when the
// server itself rejected the request); node:http instead of global fetch; a
// failed search resolves [] instead of throwing.
//
// IMPORTANT: the WebSearch Result schema requires `time.published` (a finite
// number) for non-empty results — omitting it makes the core decoder reject
// the array with 503. wigolo returns no timestamp, so we synthesize 0.
//
// NOTE: unlike the built-ins, plugin tool executes don't run the permission
// system's ask/allow assert (only wholly-denied rules hide the tool), so
// opencode.jsonc must keep webfetch/websearch allowed — it does.

import http from "node:http";

const WIGOLO_MCP = process.env.WIGOLO_MCP_URL || "http://127.0.0.1:3333/mcp";

let sessionId = null;

function rpc(body, session, timeoutMs) {
  return new Promise((resolve, reject) => {
    const u = new URL(WIGOLO_MCP);
    let settled = false;
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
        timeout: timeoutMs ?? 25_000,
      },
      (res) => {
        const sidRaw = res.headers["mcp-session-id"];
        const sid = Array.isArray(sidRaw) ? sidRaw[0] : sidRaw;
        if (sid) sessionId = sid;
        let data = "";
        // Settle as soon as a complete JSON-RPC payload has arrived — the
        // server may hold the SSE stream open after answering.
        const tryParse = (final) => {
          if (settled) return;
          try {
            const payload = data.trimStart().startsWith("{")
              ? data
              : data
                  .split("\n")
                  .filter((l) => /^data: ?/.test(l))
                  .map((l) => l.replace(/^data: ?/, ""))
                  .join("\n");
            const parsed = JSON.parse(payload);
            settled = true;
            req.destroy();
            if ((res.statusCode ?? 500) >= 400) {
              reject(new Error(`wigolo MCP HTTP ${res.statusCode}`));
            } else if (parsed.error) {
              const err = new Error(`wigolo MCP error: ${parsed.error.message ?? JSON.stringify(parsed.error)}`);
              err.protocol = true; // server processed and rejected: re-sending won't help
              reject(err);
            } else {
              resolve(parsed.result);
            }
          } catch (e) {
            if (final && !settled) {
              settled = true;
              reject(e);
            }
          }
        };
        res.setEncoding("utf8");
        res.on("data", (c) => {
          data += c;
          tryParse(false);
        });
        res.on("end", () => tryParse(true));
      },
    );
    req.on("timeout", () => req.destroy(new Error("wigolo MCP timeout")));
    req.on("error", (e) => {
      if (!settled) reject(e);
    });
    req.end(JSON.stringify(body));
  });
}

const INIT = async () => {
  await rpc(
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
  // Spec-required post-init notification; daemon tolerates its absence but
  // fire-and-forget costs nothing and future-proofs a stricter server.
  rpc({ jsonrpc: "2.0", method: "notifications/initialized" }, sessionId).catch(() => {});
};

async function call(name, args, timeoutMs) {
  if (!sessionId) await INIT();
  try {
    return await rpc({ jsonrpc: "2.0", id: Date.now(), method: "tools/call", params: { name, arguments: args } }, sessionId, timeoutMs);
  } catch (e) {
    if (e.protocol) throw e;
    sessionId = null;
    await INIT();
    return await rpc({ jsonrpc: "2.0", id: Date.now(), method: "tools/call", params: { name, arguments: args } }, sessionId, timeoutMs);
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

async function doFetch(input) {
  const format = input.format ?? "markdown";
  const url = new URL(input.url);
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("URL must use http:// or https://");
  // wigolo renders/extracts server-side and always serves markdown; the
  // requested format is echoed back unchanged. ponytail: no html/text
  // conversion — add only if a workflow actually needs it. max_content_chars
  // smart-truncates huge pages at a paragraph boundary (parity with the
  // built-in's size cap).
  const result = await call(
    "fetch",
    { url: url.href, include_full_markdown: true, max_content_chars: 200_000 },
    Math.min(Math.max(input.timeout ?? 100, 1) * 1000 + 20_000, 180_000),
  );
  const text = result?.content?.[0]?.text;
  if (!text) throw new Error(`Unable to fetch ${url.href}: empty wigolo response`);
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { markdown: text };
  }
  const output =
    typeof data.markdown === "string" && data.markdown.length > 0 ? data.markdown : String(data.content ?? "");
  if (!output) {
    if (data.error) throw new Error(`Unable to fetch ${input.url}: ${data.error_reason ?? data.error}`);
    if (typeof data.http_status === "number" && data.http_status >= 400)
      throw new Error(`Unable to fetch ${input.url}: HTTP ${data.http_status}`);
  }
  return {
    output: { url: input.url, contentType: "text/markdown", format, output },
    content: [{ type: "text", text: output }],
    metadata: { url: input.url, contentType: "text/markdown", format },
  };
}

const WEBFETCH_DESCRIPTION = `Fetch content from an HTTP or HTTPS URL and return it as clean markdown.

Use a more targeted tool when one is available. This tool is read-only. Very large pages are truncated at a paragraph boundary.

Routed through the local wigolo daemon: responses are cached, JS-rendered pages and anti-bot sites are handled, repeat fetches are instant.`;

// Mirrors the built-in webfetch schema so the model-facing contract is
// unchanged; the registry lets this registration replace the stock tool.
const WEBFETCH_INPUT = {
  type: "object",
  properties: {
    url: { type: "string", description: "The HTTP or HTTPS URL to fetch content from" },
    format: {
      type: "string",
      enum: ["text", "markdown", "html"],
      description: "The format to return the content in. Defaults to markdown.",
      default: "markdown",
    },
    timeout: { type: "number", description: "Optional timeout in seconds (maximum: 120)" },
  },
  required: ["url"],
};

const WEBFETCH_OUTPUT = {
  type: "object",
  properties: {
    url: { type: "string" },
    contentType: { type: "string" },
    format: { type: "string" },
    output: { type: "string" },
  },
  required: ["url", "contentType", "format", "output"],
};

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
    await ctx.tool.transform((draft) => {
      draft.add({
        name: "webfetch",
        options: { codemode: false },
        description: WEBFETCH_DESCRIPTION,
        input: WEBFETCH_INPUT,
        output: WEBFETCH_OUTPUT,
        execute: (input) => doFetch(input),
      });
    });
  },
};
