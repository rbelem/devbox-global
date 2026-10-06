# Global OpenCode Rules

Prioritize retrieval-led reasoning over pretrained-knowledge-led reasoning.
If a project AGENTS.md conflicts with this file, the project file wins.

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

## Coding Standards

**Coding** — writing or editing code, unclear requirements, or a
multi-step task: read `~/.config/opencode/CODING_STANDARDS.md` before
implementing.

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

In repositories indexed by CodeGraph (a `.codegraph/` directory exists at the repo root), reach for it BEFORE grep/find or reading files when you need to understand or locate code:

- **MCP tool** (when available): `codegraph_explore` answers most code questions in one call — the relevant symbols' verbatim source plus the call paths between them, including dynamic-dispatch hops grep can't follow. Name a file or symbol in the query to read its current line-numbered source. If it's listed but deferred, load it by name via tool search.
- **Shell** (always works): `codegraph explore "<symbol names or question>"` prints the same output.

If there is no `.codegraph/` directory, skip CodeGraph entirely — indexing is the user's decision.
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

Workspace questions (how this project works, synthesis across files) → `zvec_grep_search`; exact symbol, literal, or regex lookup → `zvec_grep_rg`. Full routing, snippet, and index-lifecycle rules live in the zvec_grep server's injected instructions (single source of truth). Never create, rebuild, or drop an index unless the user asks.
<!-- ZVEC_GREP_END -->
