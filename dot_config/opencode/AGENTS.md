# Global OpenCode Rules

Prioritize retrieval-led reasoning over pretrained-knowledge-led reasoning.

## Delegation: Use Judgment

Do work directly or delegate to a specialist — pick whichever costs less
(tokens + latency) for the actual task at hand. Delegation has real
overhead: dispatch prompts, background-task bookkeeping, session setup,
context hand-off. Default to doing it yourself unless the task is clearly
suited to a specialist (deep, multi-step, or high-stakes) AND the
delegation overhead will pay for itself. For changes that span multiple
folders, parallel @fixer instances per folder can help, but only when the
parallel work has real isolation. When in doubt, do it yourself.

## Lanes: Use the Cow Worktree Plugin

When spinning multiple parallel lanes that will edit code
(worktree-per-lane fan-out), create each lane with the cow worktree plugin
(`spawn_workspace`), never raw `git worktree add`. Plugin-registered lanes
get inventory tracking (`list_worktrees`), session attach/refuse
protection, and cross-session visibility; bare git worktrees are invisible
to every other session and race-prone.

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

Would a senior engineer say this is overcomplicated? If yes, simplify.

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
- If you notice unrelated dead code, mention it - don't delete it unless asked.

When your changes create orphans:

- Remove imports/variables/functions that YOUR changes made unused.

The test: every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:

- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

## No Narration Bookkeeping (sentinel / board / pre-action)

When a system reminder fires (sentinel, Background Job Board, oracle
availability, etc.) OR you are about to dispatch a long-running lane
after the user has already confirmed the plan: **do NOT narrate the
acknowledgment or restate the plan.** Skip it entirely from the
user-visible output.

1. Sentinel / system reminder with no action needed → respond with
   ONLY the task-relevant content. Silent incorporation.
2. User confirms a plan terse-style → one short clause ("Locked in.
   Dispatching lane A.") then the first tool call.
3. Multi-tool-call turn → emit the bookkeeping preamble ONCE in the
   first chunk; subsequent chunks carry only the tool calls and per-tool
   narration.
4. Research progress → final summary at the end, OR one mid-stream
   checkpoint every ~5 turns.

Track remaining work in todowrite, not in user-visible narration.
After the FIRST turn that acknowledges bookkeeping, subsequent turns
in the same session MUST contain ZERO acknowledgment of the same
reminder, even if the reminder fires again.

## Response Clarity Rules (ASD-STE100)

### Status reporting (highest impact)

- Report state as actor + verb + object: "I restored Hy3 from
  `tencent/Hy3`."
- No `-ing` fragments as status. Finished work: past tense. Open work:
  "runs" or "waits" plus the finish condition.
- No future promise without a trigger and end state. Say what is true
  now, then what happens next: "The sync is blocked. After it finishes,
  opencode reports 2.0.22."
- When work waits on a background lane, name the signal that ends the
  wait. One line per wait: "The gate runs. I continue when it exits."
- Label inference as inference. Say the evidence: "The worktree has no
  commits, so I cannot confirm X."

### Wording

- No metaphors for state: "lands", "in flight", "wedged", "green",
  "dead end", "time bomb". Use merged / running / stuck / passed /
  blocked / failed.
- Active voice for your own actions: "I unset the key", not "the key was
  unset".
- One action per sentence in instructions. Name the owner of each step.
  "Tell me when it's run and I'll rerun the gate and land PR 5" is three
  sentences.
- Sentences ≤ 20 words for instructions, ≤ 25 for descriptions. Split
  50-word status dumps.
- No noun clusters of 3+ words. "gc-vs-install window" → "A race exists
  between gc and install. The 1-hour rule guards it."

### Names

- One concept, one word, the whole session: pick the term and repeat it
  exactly.
- Before you act on a name, resolve it to one real target. Two pods
  named "daily" means an install goes to the wrong one. When names
  collide, use the full path or id.

### Structure

- Answer first, evidence after.
- During multi-step work: one short status checkpoint per wait cycle.
  Never silence across 10+ turns; never a wall of bullets. Lists ≤ 6
  items.

These rules do not override Caveman compression; they constrain its
structure. Skip them for one-word answers and tool-only turns.

## Fetch discipline

After a fetch, quote the relevant excerpt and work from it; don't re-quote whole pages.

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
