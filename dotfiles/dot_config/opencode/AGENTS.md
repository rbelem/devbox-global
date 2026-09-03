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

**Complexity gate:** every function ≤ cyclomatic complexity 10. The
`complexity-guard` plugin appends violations to every `write`/`edit` result —
when you see `[complexity-guard]`, split the named functions into smaller
helpers in the same response, before finishing.

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

## 5. No Narration Bookkeeping (sentinel / board / pre-action)

When a system reminder fires (sentinel, Background Job Board, oracle
availability, etc.) OR you are about to dispatch a long-running lane
after the user has already confirmed the plan: **do NOT narrate the
acknowledgment or restate the plan.** Skip it entirely from the
user-visible output.

Anti-patterns (each one wastes 50-200 tokens per turn, repeated across
turns):

- "Sentinel acknowledged — board clean, no active lanes. The user wants..."
- "Board clean — all lanes reconciled. Continuing with X."
- "Now I have a clear picture. Let me also check Y."  (during research)
- "OK so the plan is A, then B, then C. Dispatching A first."
  after a terse confirmation like "sim" / "manda" / "pode" / "go".
- Restating the same plan in a multi-tool-call turn instead of emitting
  it once at the top and then letting the tool calls carry the work.

Correct behavior:

1. Sentinel / system reminder with no action needed → respond with
   ONLY the task-relevant content. Silent incorporation.
2. User confirms a plan terse-style → one short clause ("Locked in.
   Dispatching lane A.") then the first tool call. No re-narration.
3. Multi-tool-call turn → emit the bookkeeping preamble ONCE in the
   first chunk; subsequent chunks carry only the tool calls and per-tool
   narration. Do not paste the same preamble before every tool.
4. Research progress → final summary at the end, OR one mid-stream
   checkpoint every ~5 turns. Never "Now I have the picture. Let me
   also check X" preambles per turn.

Track remaining work in todowrite, not in user-visible narration.
After the FIRST turn that acknowledges bookkeeping, subsequent turns
in the same session MUST contain ZERO acknowledgment of the same
reminder, even if the reminder fires again.

Pinned from memory: sentinel-acknowledgment anti-pattern has fired 7+
times across zet sessions (#244, #609, #817, #903, #989, #1004, #1009,
#1015). The memory layer is exhausted; the rule lives here.

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

<!-- HERDR_START -->
## Herdr

Herdr is the terminal workspace manager (tmux replacement) — sessions → workspaces → tabs → panes, agent-aware. There is no herdr MCP server; agents drive it through the `herdr` CLI and socket API.

The **herdr skill** (`herdr` in ~/.agents/skills, auto-loaded) teaches pane/workspace control — splitting panes, running commands without stealing focus, reading output, waiting on other agents. Load it when the task involves herdr panes.

**Context:** when opencode runs inside a herdr pane, `HERDR_ENV=1`, `HERDR_PANE_ID`, `HERDR_BIN_PATH`, and `HERDR_SOCKET_PATH` are set. The herdr-agent-state plugin (`~/.config/opencode/plugins/herdr-agent-state.js`) reports lifecycle state (idle/working/blocked) and session identity back to herdr.

### Key CLI surface

| Need | Command |
|---|---|
| Runtime status | `herdr status`, `herdr status server`, `herdr status client` |
| What herdr sees (agents/panes) | `herdr agent list` |
| Why a pane was classified a certain way | `herdr agent explain --json` |
| Send keys to a pane | `herdr pane send-keys <pane_id> <text>` (see skill for exact usage) |
| Read pane output | `herdr pane output <pane_id>` / `--follow` (see skill) |
| Split pane / new tab / new workspace | `herdr pane split`, `herdr tab new`, `herdr workspace new` |
| Report agent state (custom integrations) | `herdr pane report-agent <pane_id> --state working\|idle\|blocked --source <src>` |
| Reload config | `herdr server reload-config` |

Full reference: `herdr --help`, https://herdr.dev/docs/cli-reference/, and the herdr skill.
<!-- HERDR_END -->

<!-- SKILLS_EXTERNALLY_MANAGED_START -->
## Externally managed skills (not in `.skill-lock.json`)

Some skill folders in `~/.agents/skills/` are installed and tracked by their own installer, not the `agents` CLI. They will show as "untracked" in `skill-maintenance` audits — that is correct, not a problem to fix.

| Folder pattern | Installer | Receipts / source of truth | Update | Remove |
|---|---|---|---|---|
| `wigolo*` (11 packs) | `wigolo skills add --global --agent codex` | `~/.wigolo/skills/receipts.json` (versioned, SHA256 per file) | `wigolo skills add --global --agent codex --force` after a wigolo version bump | `wigolo skills remove --global --agent codex [<pack>]` |

**Do not** add these to `~/.agents/.skill-lock.json`. The lock schema is github-sourced only (`sourceType: "github"`); fabricating entries would mislead `agents` sync and risk silent drift. Two clean registries, no overlap.
<!-- SKILLS_EXTERNALLY_MANAGED_END -->

<!-- ZVEC_GREP_START -->
## zvec-grep

Choose the evidence source before the retrieval mode.

### Workspace evidence
- Use the current workspace as the evidence source when the user asks about local material, prior context establishes it as relevant, or the question concerns how the current project works—even if the workspace is not mentioned explicitly.
- A workspace may contain any mix of code, documents, configuration, and data.
- Do not use workspace retrieval for unrelated open-world questions, current external facts, or web content that does not depend on local evidence.

### Retrieval routing
- When an exact word, phrase, name, date, identifier, filename, path, configuration key, error message, source fragment, literal, or regex is known and locating its occurrences is sufficient, use `zvec_grep_zvec_grep_rg` when it is listed by the current host; otherwise native Grep or `rg`.
- Use `zvec_grep_zvec_grep_search` when wording or location is unknown, or when the answer requires semantic, conceptual, fuzzy, or paraphrase discovery; relationships, chronology, causality, architecture, or data or control flow; or comparison or synthesis across files, sections, or documents.
- For a mixed task with exact anchors that still requires relationships or cross-file synthesis, call `zvec_grep_zvec_grep_search` with the concept and anchors, then use `zvec_grep_zvec_grep_rg` when it is listed by the current host; otherwise native Grep or `rg` for focused follow-up.
- When no sufficient exact anchor is available and the user asks whether conceptually related material exists locally, make at most one focused `zvec_grep_zvec_grep_search` probe using the question plus distinctive names, dates, or terms. This probe does not apply to exact quotations, configuration keys, filenames, regexes, or exhaustive occurrence requests. Continue only when results are relevant; otherwise stop and report that the indexed workspace did not establish the answer.
- Before broad file reads or delegating workspace discovery, use the appropriate search route. Do not delegate solely to locate material, and stop when the evidence is sufficient.

### Search evidence
- Search results include bounded source snippets. Treat a sufficient snippet as already-read evidence, and read a cited file only when a required detail falls outside the snippet.

### Freshness and index lifecycle
- Pass a daemon-visible absolute `root` on every zvec-grep workspace call.
- Read `freshness` and `background_refresh` from search results without a status preflight.
- When results are `served_from_current_index`, use them when sufficient instead of waiting for the background refresh.
- If the index is missing but exact or regex lookup can answer the task, use `zvec_grep_zvec_grep_rg` when it is listed by the current host; otherwise native Grep or `rg`.
- Creating, rebuilding, or dropping a persistent index requires an explicit user request or authorization; never do so silently.

<!-- ZVEC_GREP_END -->
