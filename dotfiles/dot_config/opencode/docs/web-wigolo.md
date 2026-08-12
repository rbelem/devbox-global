# Web Intelligence (wigolo)

**wigolo is the default web backend.** Firecrawl is disabled (MCP server
off, skills unlinked). Use wigolo tools for all web work — search, fetch,
crawl, extract, cache, find-similar, research, autonomous gather, diff,
watch.

| Need | wigolo tool |
|---|---|
| Web search (multi-engine, ML reranked, explainable scoring) | `wigolo_search` |
| Fetch one URL → clean markdown (handles JS SPAs, anti-bot, PDFs) | `wigolo_fetch` |
| Crawl a site (BFS/DFS/sitemap/map-only) | `wigolo_crawl` |
| Structured data from a page (tables, JSON-LD, custom schema) | `wigolo_extract` |
| Query the local cache (keyword + semantic hybrid) | `wigolo_cache` |
| Pages similar to a URL or concept | `wigolo_find_similar` |
| Multi-step cited research brief | `wigolo_research` |
| Autonomous gather loop with output schema | `wigolo_agent` |
| Diff a page vs its cached copy | `wigolo_diff` |
| Watch a URL for changes (webhook delivery) | `wigolo_watch` |

The MCP daemon runs at `http://127.0.0.1:3333/mcp` (devbox global service,
`restart=always`). Every result is cached under `~/.wigolo/` — re-queries
are instant and free. No API key needed for the core tools; set
`WIGOLO_LLM_PROVIDER` + `GEMINI_API_KEY` only if you want
`wigolo_research` / `wigolo_agent` to synthesize cited answers.

The built-in `websearch` and `webfetch` tools are disabled in
`opencode.json` (`permission.webfetch: deny`, `permission.websearch:
deny`) — wigolo is the only web surface.

Skill packs (`wigolo-*` in `~/.agents/skills/`) provide per-tool usage
guidance; load them when you need flag-level detail for a specific tool.
