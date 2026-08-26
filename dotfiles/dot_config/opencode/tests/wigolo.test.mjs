// Confirms websearch + webfetch route through wigolo and the daemon answers.
// Speaks the same MCP protocol (streamable HTTP, tools/call, 2025-06-18) and
// sends the same arguments as plugins/wigolo-search.js — so a green run means
// the two built-in tools will work against the live daemon.
// Stdlib only (node:test); run: node --test tests/
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MCP_URL = process.env.WIGOLO_MCP_URL || "http://127.0.0.1:3333/mcp";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

let sessionId = null;

// Same response handling as the plugin: the daemon may hold the SSE stream
// open after answering, so parse the first complete JSON-RPC payload.
async function rpc(method, params) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30_000);
  try {
    const res = await fetch(MCP_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
        ...(sessionId ? { "Mcp-Session-Id": sessionId } : {}),
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method, params }),
      signal: ctrl.signal,
    });
    const sid = res.headers.get("mcp-session-id");
    if (sid) sessionId = sid;
    if (res.status >= 400) throw new Error(`wigolo MCP HTTP ${res.status}`);
    const raw = await res.text();
    const text = raw.trimStart().startsWith("{")
      ? raw
      : raw
          .split("\n")
          .filter((l) => /^data: ?/.test(l))
          .map((l) => l.replace(/^data: ?/, ""))
          .join("\n");
    const parsed = JSON.parse(text);
    if (parsed.error) throw new Error(`wigolo MCP error: ${parsed.error.message ?? JSON.stringify(parsed.error)}`);
    return parsed.result;
  } catch (e) {
    throw new Error(
      `wigolo daemon not reachable at ${MCP_URL} (${e.message}). ` +
        "Start it with: devbox global services restart wigolo",
      { cause: e },
    );
  } finally {
    clearTimeout(timer);
  }
}

async function toolCall(name, args) {
  const result = await rpc("tools/call", { name, arguments: args });
  const text = result?.content?.[0]?.text;
  assert.ok(text, `tools/call ${name} returned no content`);
  return JSON.parse(text);
}

test("wigolo daemon MCP handshake", async () => {
  const result = await rpc("initialize", {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "opencode-wigolo-search-test", version: "0" },
  });
  assert.ok(result.serverInfo, "initialize returned serverInfo");
  assert.ok(sessionId, "daemon issued a session id");
});

test("websearch surface: search tool returns results", async () => {
  // Same arguments the plugin's doSearch sends.
  const data = await toolCall("search", { query: "opencode", search_depth: "fast", max_results: 10 });
  assert.ok(Array.isArray(data.results), "search returned a results array");
  assert.ok(data.results.length > 0, "search returned at least one result");
  for (const r of data.results) {
    assert.equal(typeof r.url, "string");
    assert.ok(r.url.length > 0, "result has a URL (plugin filters these in)");
  }
});

test("webfetch surface: fetch tool returns markdown", async () => {
  // Same arguments the plugin's doFetch sends.
  const data = await toolCall("fetch", {
    url: "https://example.com",
    include_full_markdown: true,
    max_content_chars: 200_000,
  });
  assert.equal(typeof data.markdown, "string");
  assert.ok(data.markdown.length > 0, "fetch returned non-empty markdown");
  assert.match(data.markdown, /example/i);
});

test("plugin wiring: websearch/webfetch are routed through wigolo", () => {
  const plugin = readFileSync(path.join(ROOT, "plugins/wigolo-search.js"), "utf8");
  assert.match(plugin, /websearch\.transform/, "plugin registers the websearch provider");
  assert.match(plugin, /name: "webfetch"/, "plugin overrides the webfetch tool");
  assert.match(plugin, /codemode: false/, "webfetch must be a direct-callable tool (codemode:true makes it execute-only and it never replaces the stock tool)");
  assert.match(plugin, /output: WEBFETCH_OUTPUT/, "output schema must be declared — doFetch returns an output field and the runtime rejects results that declare output without a schema");
  assert.match(plugin, /WIGOLO_MCP_URL/, "plugin honors WIGOLO_MCP_URL");

  const config = readFileSync(path.join(ROOT, "opencode.jsonc"), "utf8");
  assert.match(config, /\{ "resource": "\*", "effect": "allow", "action": "webfetch" \}/, "webfetch is allowed");
  assert.match(config, /\{ "resource": "\*", "effect": "allow", "action": "websearch" \}/, "websearch is allowed");
  if (!process.env.WIGOLO_MCP_URL) {
    assert.match(config, new RegExp(MCP_URL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), "config points at the daemon under test");
  }

  const slim = readFileSync(path.join(ROOT, "oh-my-opencode-slim.jsonc"), "utf8");
  assert.match(
    slim,
    /"webfetch"\s*:\s*\{[^}]*"enabled"\s*:\s*false/,
    "oh-my-opencode-slim must not register its own webfetch (it loads after wigolo-search and shadows the plugin's replacement)",
  );
});