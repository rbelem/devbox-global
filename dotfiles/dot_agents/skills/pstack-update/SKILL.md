---
name: pstack-update
description: Update the rbelem/skills pstack fork (OpenCode port of poteto's pstack) from upstream cursor/plugins. Use when the user says "update pstack", "sync pstack", "pull pstack upstream", or asks what changed in pstack upstream.
---

# pstack update

- Fork (canonical, installed via `skills add rbelem/skills`): `~/Workspace/github.com/rbelem/skills/pstack/`
- Upstream: https://github.com/cursor/plugins/tree/main/pstack — Cursor plugin by Lauren Tan (poteto), MIT
- Port notes + substitution table (canonical): `pstack/README.md` in the fork

## Procedure

1. **Fresh upstream clone** (sparse, disposable):

   ```bash
   git clone --depth 1 --filter=blob:none --sparse https://github.com/cursor/plugins.git /tmp/opencode/cursor-plugins
   cd /tmp/opencode/cursor-plugins && git sparse-checkout set pstack
   ```

2. **See what changed** (upstream vs fork):

   ```bash
   diff -rq /tmp/opencode/cursor-plugins/pstack/skills ~/Workspace/github.com/rbelem/skills/pstack/skills
   diff -rq /tmp/opencode/cursor-plugins/pstack/agents ~/Workspace/github.com/rbelem/skills/pstack/agents
   ```

   No diffs → done. Report and stop.

3. **Re-port changed/new files**: copy the upstream version over the fork, then re-apply the substitution table from `pstack/README.md`. Quick reference:

   | Upstream (Cursor) | Fork (OpenCode) |
   | --- | --- |
   | `AskQuestion` | `question` tool |
   | `~/.cursor/rules/pstack-models.mdc` | `~/.config/opencode/pstack-models.md` |
   | `~/.cursor/skills/` / `.cursor/skills/` | `~/.config/opencode/skills/` / `.opencode/skills/` |
   | "Cursor cloud agent" | "background agent" |
   | `generalPurpose` | `general` |
   | `/deslop` (cursor-team-kit) | `/stop-slop` |
   | `control-cli` / `control-ui` | direct CLI runs / `agent-browser` skill |
   | `agent-transcripts/` workspace dir | opencode session store (query via `opencode` session commands, not filesystem) |

   `skills/unslop/SKILL.md` must keep its extra frontmatter:

   ```yaml
   metadata:
     opencode/autoinvoke: "true"
   ```

4. **Rename collisions** — `tdd` and `teach` are owned by `mattpocock/skills` in the lock file; never ship pstack's under those names:
   - `skills/tdd` → `skills/pstack-tdd`, `skills/teach` → `skills/pstack-teach`
   - Fix the `name:` frontmatter to match. (Currently no other pstack file references them by path.)
   - Same rule for any NEW upstream skill colliding with a lock-tracked name: prefix `pstack-`.

5. **Slug rule**: every skill's `name:` frontmatter must equal its directory name. Check:

   ```bash
   cd ~/Workspace/github.com/rbelem/skills/pstack/skills
   for f in */SKILL.md; do d=$(dirname "$f"); n=$(grep -m1 "^name:" "$f" | sed 's/^name: *//; s/"//g'); [ "$d" != "$n" ] && echo "$f -> '$n'"; done
   ```

6. **Verify zero Cursor residue** (must return nothing):

   ```bash
   grep -rn "\.cursor/\|AskQuestion\|cursor-team-kit\|deslop" --include="*.md" ~/Workspace/github.com/rbelem/skills/pstack/
   ```

7. **Commit + push the fork repo** — stage ONLY `pstack/` and `pstack-update/`; the repo carries unrelated uncommitted work (benchmark-model-preset). Never `git add -A`. Do not amend/rebase.

8. **Reinstall via the skills CLI** (fork is the lock source, so update flows from it):

   ```bash
   skills update <changed skill names> -g -y   # or: skills update -g -y for all
   ```

## Gotchas

- **dcg blocks `rm -rf`** on skill dirs — overwrite with `cp`/`mv` instead; scratch work lives in `/tmp/opencode/`.
- **`agents/` is outside the skills CLI**: `poteto-agent.md` and `comment-sicko.md` are symlinked into `~/.config/opencode/agent/`. The symlinks point at fork files, so step 3 updates them in place — but re-check the agent diffs in step 2.
- **Not ported, on purpose**: `automations/benny` (Cursor+Slack automation) and `docs/guide` (Cursor-install oriented). Don't start porting them without asking.
- After updating skills, restart opencode to pick up changes.
