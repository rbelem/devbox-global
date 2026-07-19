# Global OpenCode Rules

Behavioral guidelines to reduce common LLM coding mistakes. Merge with
project-specific instructions as needed.

Prioritize retrieval-led reasoning over pretrained-knowledge-led reasoning.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial
tasks, use judgment.

---

## Delegation: Use Judgment

You can do work directly or delegate to a specialist. Pick whichever costs
less (tokens + latency) for the actual task at hand. Delegation has real
overhead — dispatch prompts, background-task bookkeeping, session setup, and
context hand-off. For trivial or single-step work, doing it yourself is
usually cheaper than delegating.

These lanes are available when delegation is the better trade-off:

- **Routine mechanical work** (git status/diff/commit/push, lint, typecheck,
  test, build, install, any no-edit shell command) → **@fast-generic** (cheap;
  good when you would otherwise block on a long shell command)

- **Code editing / implementation** once the plan is clear → **@fixer**. For
  changes that span multiple folders, parallel @fixer instances per folder
  can help, but only when the parallel work has real isolation.

- **Codebase discovery** (find a file, find a symbol, where is X) → **@explorer**

- **Library / API research, web research, docs lookup** → **@librarian**

- **UI/UX work** (user-facing components, polish, responsive, motion) →
  **@designer**

- **Architecture / design decisions, code review, complex debugging** →
  **@oracle**

- **Visual analysis** (screenshots, images, PDFs) → **@observer**

- **Multi-model consensus for high-stakes decisions** → **@council**

Default to doing it yourself unless the task is clearly suited to a
specialist (deep, multi-step, or high-stakes) AND the delegation overhead
will pay for itself. When in doubt, do it yourself.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:

- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:

- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria
("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer
rewrites due to overcomplication, and clarifying questions come before
implementation rather than after mistakes.

## Caveman Mode

Caveman mode always on. Load and apply the `caveman` skill at session start.
Full level by default.

<!-- CODEGRAPH_START -->
## CodeGraph

This project has a CodeGraph MCP server (`codegraph_*` tools) configured. CodeGraph is a tree-sitter-parsed knowledge graph of every symbol, edge, and file. Reads are sub-millisecond and return structural information grep cannot.

### When to prefer codegraph over native search

Use codegraph for **structural** questions — what calls what, what would break, where is X defined, what is X's signature. Use native grep/read only for **literal text** queries (string contents, comments, log messages) or after you already have a specific file open.

| Question | Tool |
|---|---|
| "Where is X defined?" / "Find symbol named X" | `codegraph_search` |
| "What calls function Y?" | `codegraph_callers` |
| "What does Y call?" | `codegraph_callees` |
| "How does X reach/become Y? / trace the flow from X to Y" | `codegraph_trace` (one call = the whole path, incl. callback/React/JSX dynamic hops) |
| "What would break if I changed Z?" | `codegraph_impact` |
| "Show me Y's signature / source / docstring" | `codegraph_node` |
| "Give me focused context for a task/area" | `codegraph_context` |
| "See several related symbols' source at once" | `codegraph_explore` |
| "What files exist under path/" | `codegraph_files` |
| "Is the index healthy?" | `codegraph_status` |

### Rules of thumb

- **Answer directly — don't delegate exploration.** For "how does X work" / architecture questions, answer with 2-3 codegraph calls: `codegraph_context` first, then ONE `codegraph_explore` for the source of the symbols it surfaces. For a specific **flow** ("how does X reach Y") start with `codegraph_trace` from→to — one call returns the whole path with dynamic hops bridged — then ONE `codegraph_explore` for the bodies; don't rebuild the path with `codegraph_search` + `codegraph_callers`. Codegraph IS the pre-built index, so spawning a separate file-reading sub-task/agent — or running a grep + read loop — repeats work codegraph already did and costs more for the same answer.
- **Trust codegraph results.** They come from a full AST parse. Do NOT re-verify them with grep — that's slower, less accurate, and wastes context.
- **Don't grep first** when looking up a symbol by name. `codegraph_search` is faster and returns kind + location + signature in one call.
- **Don't chain `codegraph_search` + `codegraph_node`** when you just want context — `codegraph_context` is one call.
- **Don't loop `codegraph_node` over many symbols** — one `codegraph_explore` call returns several symbols' source grouped in a single capped call, while each separate node/Read call re-reads the whole context and costs far more.
- **Index lag — check the staleness banner, don't guess a wait.** When a codegraph response starts with "⚠️ Some files referenced below were edited since the last index sync…", the listed files are pending re-index — Read those specific files for accurate content. Files NOT in that banner are fresh and codegraph is authoritative for them. `codegraph_status` also lists pending files under "Pending sync".

### If `.codegraph/` doesn't exist

The MCP server returns "not initialized." Ask the user: *"I notice this project doesn't have CodeGraph initialized. Want me to run `codegraph init -i` to build the index?"*
<!-- CODEGRAPH_END -->

<!-- TMUX_START -->
## Tmux

This project has a libtmux-mcp MCP server (`tmux_*` tools) configured. It controls tmux sessions, windows, and panes — read output, send keystrokes, wait for text, and manage the terminal layout.

**Safety:** `LIBTMUX_SAFETY=read+send` is set — you can read panes and send keys, but kill operations are blocked.

### When to use tmux tools

| Scenario | Tool |
|---|---|
| List all sessions | `list_sessions` |
| List windows in a session | `list_windows` with `session_id` |
| List panes in a window | `list_panes` with `target` (e.g., `"mysession:1"`) |
| Read pane content | `capture_pane` with `target` and optional `lines` |
| Send keystrokes to a pane | `send_keys` with `target`, `keys`, and optional `enter` |
| Wait for text to appear | `wait_for_text` with `target`, `text`, and optional `timeout` (blocks server-side, no polling needed) |
| Wait for content change | `wait_for_content_change` with `target` and optional `timeout` |
| Rich pane state (content+cursor+mode+scroll) | `snapshot_pane` with `target` |
| Incremental read (since last capture) | `capture_since` with `target` and `cursor` |
| Get pane info (PID, TTY, command) | `get_pane_info` with `target` |
| Search all panes in a session | `search_panes` with `session_id` and `pattern` |
| Split pane | `split_window` with `target` and optional `direction`, `size`, `command` |
| Create new window | `create_window` with `session_id`, optional `name` and `command` |
| Create new session | `create_session` with `name`, optional `command` |
| Select/focus a pane | `select_pane` with `target` |
| Resize pane | `resize_pane` with `target`, `direction`, `amount` |
| Set pane title | `set_pane_title` with `target`, `title` |
| Clear pane scrollback | `clear_pane` with `target` |
| Enter/exit copy mode | `enter_copy_mode` / `exit_copy_mode` with `target` |
| Pipe pane output to a command | `pipe_pane` with `target`, `command`, optional `open`/`close` |
| Show/set tmux options | `show_option` / `set_option` with name/value |
| Show/set environment | `show_environment` / `set_environment` with name/value |
| Get server info | `get_server_info` |

### Target format

All pane/window tools accept a `target` parameter. Formats:
- `session:window.pane` — e.g., `"dev:1.2"`
- `session:window` — e.g., `"dev:1"`
- `session` — defaults to active window and pane
- Omit → current session's active pane

### Key patterns

- **Use `wait_for_text` instead of polling** — it blocks server-side until the text appears, saving tokens and round-trips.
- **Use `snapshot_pane` for rich diagnostics** — it returns content, cursor position, copy-mode state, and scroll offset in one typed call.
- **Use `capture_since` for incremental reads** — pass the cursor from a previous capture to get only new/changed lines.
- **Don't re-discover topology** — if you already have a session/window/pane ID from a prior call, reuse it directly instead of calling `list_sessions` → `list_windows` → `list_panes` again.
<!-- TMUX_END -->

## Web Intelligence (wigolo)

**wigolo is the default web backend.** Firecrawl is disabled (MCP server off, skills unlinked). Use wigolo tools for all web work — search, fetch, crawl, extract, cache, find-similar, research, autonomous gather, diff, watch.

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

The MCP daemon runs at `http://127.0.0.1:3333/mcp` (devbox global service, `restart=always`). Every result is cached under `~/.wigolo/` — re-queries are instant and free. No API key needed for the core tools; set `WIGOLO_LLM_PROVIDER` + `GEMINI_API_KEY` only if you want `wigolo_research` / `wigolo_agent` to synthesize cited answers.

The built-in `websearch` and `webfetch` tools are disabled in `opencode.json` (`permission.webfetch: deny`, `permission.websearch: deny`) — wigolo is the only web surface.

Skill packs (`wigolo-*` in `~/.agents/skills/`) provide per-tool usage guidance; load them when you need flag-level detail for a specific tool.


<!-- SKILLS_EXTERNALLY_MANAGED_START -->
## Externally managed skills (not in `.skill-lock.json`)

Some skill folders in `~/.agents/skills/` are installed and tracked by their own installer, not the `agents` CLI. They will show as "untracked" in `skill-maintenance` audits — that is correct, not a problem to fix.

| Folder pattern | Installer | Receipts / source of truth | Update | Remove |
|---|---|---|---|---|
| `wigolo*` (11 packs) | `wigolo skills add --global --agent codex` | `~/.wigolo/skills/receipts.json` (versioned, SHA256 per file) | `wigolo skills add --global --agent codex --force` after a wigolo version bump | `wigolo skills remove --global --agent codex [<pack>]` |

**Do not** add these to `~/.agents/.skill-lock.json`. The lock schema is github-sourced only (`sourceType: "github"`); fabricating entries would mislead `agents` sync and risk silent drift. Two clean registries, no overlap.
<!-- SKILLS_EXTERNALLY_MANAGED_END -->

