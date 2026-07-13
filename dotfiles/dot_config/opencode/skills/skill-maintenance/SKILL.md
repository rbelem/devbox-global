---
name: skill-maintenance
description: Maintain, update, and clean up installed OpenCode skills across both `~/.agents/skills/` (CLI-managed) and `~/.config/opencode/skills/` (plugin-managed). Use when users want to update skills, check for updates, remove duplicates, audit the skill inventory, or resolve stale or manually-installed skill folders.
---

# Skill Maintenance

This skill covers how to update, audit, and remove skills in the two co-existing skill systems on this OpenCode setup.

There are two independent systems. Do not confuse them:

| System | Path | Manager |
|---|---|---|
| System 1 | `~/.agents/skills/` | `skills` CLI (v1.5.15) |
| System 2 | `~/.config/opencode/skills/` | oh-my-opencode-slim plugin (v2.1.1) |

## System 1: `~/.agents/skills/`

Managed by the `skills` CLI.

### Lock file

```text
~/.agents/.skill-lock.json
```

Tracks roughly 45 skills from 11 GitHub sources. Each entry contains:

- `source`
- `sourceType`
- `sourceUrl`
- `skillPath`
- `skillFolderHash`
- `installedAt`
- `updatedAt`

### Commands

Install skill(s) globally from a GitHub repo:

```bash
skills add <github-repo> -g
```

Install all skills for all agents without prompting:

```bash
skills add <github-repo> -g --skill '*' --agent '*' -y
```

List available skills in a repo before installing:

```bash
skills add <github-repo> -l
```

Update all global skills to their latest upstream versions:

```bash
skills update --global --yes
```

Without `--yes`, the command prompts for scope.

Remove a global skill:

```bash
skills remove <name> -g
```

Remove all global skills without prompting:

```bash
skills remove <name> -g --skill '*' --agent '*' -y
```

List installed global skills with paths, scopes, and target agents:

```bash
skills list --global --json
```

Search for available skills interactively:

```bash
skills find [query]
```

### Current GitHub sources

The 11 tracked sources are:

- `brianlovin/claude-config`
- `vercel-labs/skills`
- `vercel-labs/agent-browser`
- `JuliusBrussee/caveman`
- `github/awesome-copilot`
- `greptileai/skills`
- `mattpocock/skills`
- `wshobson/agents`
- `jetify-com/devbox`
- `alibaba/open-code-review`
- `Leonxlnx/taste-skill`

### Untracked skills

Skills physically present in `~/.agents/skills/` but not listed in `~/.agents/.skill-lock.json` were installed manually, not via `skills add`. `skills update` will not touch them. They must be maintained by hand.

Examples of untracked skills include:

- Security/IoT pentest toolkit: `apktool`, `chipsec`, `ffind`, `iotnet`, `jadx`, `jtagprobe`, `logicmso`, `netflows`, `nmap`, `onvifscan`, `picocom`, `telnetshell`, `wsdiscovery`, `vulnerability-scanning`
- Writing skills: `write-a-skill`, `writing-beats`, `writing-fragments`, `writing-shape`, `edit-article`
- Others: `caveman`, `caveman-compress`, `docling`, `agent-reach`, and similar

## System 2: `~/.config/opencode/skills/`

Managed by the oh-my-opencode-slim plugin.

### Manifest file

```text
~/.config/opencode/.oh-my-opencode-slim/skills-manifest.json
```

Tracks the 11 bundled skills. Each entry contains:

- `status` — `managed` if the user has not modified the skill, `customized` if local changes exist
- `packageVersion`
- `sourceHash`
- `lastManagedHash`
- `lastSeenHash`
- `stagedPath` — set for customized skills with pending updates
- `updatedAt`

### Bundled skills

The 11 bundled skills are:

- `simplify`
- `codemap`
- `clonedeps`
- `deepwork`
- `reflect`
- `oh-my-opencode-slim`
- `release-smoke-test`
- `worktrees`
- `benchmark-model-preset`
- `graphify`
- `loop-engineering`

### Update mechanism

Updates are fully automatic. When the oh-my-opencode-slim npm plugin updates, a `skill-sync` hook copies new skill versions from the package's `src/skills/` into `~/.config/opencode/skills/`.

Plugin cache location:

```text
~/.cache/opencode/packages/oh-my-opencode-slim@latest/
```

Behavior by status:

- `managed` skills: the new version overwrites the old one automatically.
- `customized` skills: the new version is staged to `~/.config/opencode/.oh-my-opencode-slim/skill-updates/<version>/` and is not applied automatically. The user must manually merge or accept the staged update.

No manual command is required for normal updates. They arrive after an OpenCode restart following a plugin update. To force a plugin update, change the version pin in `~/.config/opencode/opencode.json` under the `"plugin"` array. Currently this is just `"oh-my-opencode-slim"`, which resolves to `@latest`.

## Skill-to-Agent Assignment

Agent skill assignments live in:

```text
~/.config/opencode/oh-my-opencode-slim.json
```

The active preset's agent blocks define which skills each agent can use.

Syntax:

- `["*"]` — all skills
- `["simplify", "code-review"]` — explicit allow list
- `["*", "!find-skills"]` — all skills except the excluded ones

Before removing a skill, always check `oh-my-opencode-slim.json` for references. If a skill name appears in an agent's `"skills"` array, deleting the skill folder will break that agent. Update the config first to remove the reference, then delete the folder.

Example: `diagnose` was referenced in the `oracle` agent's skills list. Before deleting the `diagnose/` folder, the config was updated to reference `diagnosing-bugs` (the upstream-canonical name) instead.

## Duplicate Detection and Removal Workflow

1. **List all installed skills**
   - System 1: `skills list --global --json`
   - System 2: `ls ~/.config/opencode/skills/`

2. **Check lock file coverage**
   - Compare installed folder names in `~/.agents/skills/` against keys in `~/.agents/.skill-lock.json`.
   - Anything installed but not in the lock file was installed manually and will not auto-update.

3. **Identify duplicates**
   - Group skills by semantic overlap, for example `review` vs `code-review`, `compress` vs `caveman-compress`, `diagnose` vs `diagnosing-bugs`.
   - Check the `description` field in each `SKILL.md` frontmatter. Identical or near-identical descriptions signal duplicates.

4. **Verify upstream**
   - Before removing, confirm which name exists upstream.
   - Use the GitHub API (unauthenticated, public repos):

     ```bash
     curl -s https://api.github.com/repos/<owner>/<repo>/contents/<path> | python3 -c "import json,sys; [print(x['name']) for x in json.load(sys.stdin) if x['type']=='dir']"
     ```

   - Keep the name that exists upstream; the other is a stale local copy.

5. **Check config references**
   - Search the skill name in `~/.config/opencode/oh-my-opencode-slim.json`.
   - If referenced, update the config to use the canonical name before deleting the folder.

6. **Remove the stale copy**
   - For manually installed skills: `rm -rf ~/.agents/skills/<stale-name>`
   - For lock-file-tracked skills: `skills remove <stale-name> -g`

7. **Verify**
   - Confirm the canonical version still exists and the stale one is gone.

## Key Files Reference

| Path | Purpose |
|---|---|
| `~/.agents/skills/` | Global skills (System 1, `skills` CLI) |
| `~/.agents/.skill-lock.json` | Lock file tracking System 1 skills |
| `~/.config/opencode/skills/` | Bundled skills (System 2, oh-my-opencode-slim) |
| `~/.config/opencode/.oh-my-opencode-slim/skills-manifest.json` | Manifest tracking System 2 skills |
| `~/.config/opencode/.oh-my-opencode-slim/skill-updates/<version>/` | Staged updates for customized System 2 skills |
| `~/.config/opencode/oh-my-opencode-slim.json` | Plugin config: presets, agent models, skill/MCP assignments |
| `~/.config/opencode/opencode.json` | OpenCode core config: plugin registration, providers |
| `~/.cache/opencode/packages/oh-my-opencode-slim@latest/` | Cached plugin package (source of System 2 skill updates) |

## When to Use This Skill

Use this skill when the user asks to:

- update skills
- check for skill updates
- remove or clean up skills
- find duplicate skills
- check which skills need removal
- maintain or manage installed skills
- audit the skill inventory

Do NOT use this skill for:

- Writing new skills (use the `write-a-skill` skill instead)
- Configuring agent models or MCPs (use the `oh-my-opencode-slim` skill instead)
- Creating custom agents (use the `oh-my-opencode-slim` skill instead)

## Safety Rules

1. **Never delete a skill referenced in `oh-my-opencode-slim.json` without updating the config first.**
2. **Always verify upstream before removing a "duplicate."** The locally older name might be canonical if the upstream repo renamed.
3. **Do not touch `~/.config/opencode/skills/` manually.** Those folders are managed by the oh-my-opencode-slim plugin's auto-sync. If a System 2 skill is customized and has a staged update, let the user decide whether to accept or discard it.
4. **Check both systems before reporting a skill as "missing" or "orphaned."** A skill may exist in one system but not the other.
5. **Restart OpenCode after config changes** for them to take effect.
