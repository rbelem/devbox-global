# devbox-global

Personal devbox global config (Rodrigo Belem). Declares entire CLI dev
environment — Nix packages, dotfiles, shell config, editor — installable on any
Linux machine via `devbox global pull`.

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

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

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

## Repo structure

```
devbox.json              # global package + script declarations
devbox.lock              # pinned nixpkgs versions (stale, 2023)
devbox.d/<name>/         # 15 flake-based packages (referenced path:devbox.d/<name>)
dotfiles/                # chezmoi root (.chezmoiroot = dotfiles)
devbox-global-update-flake  # standalone script: check & update flake versions
devbox-global-config-sync  # standalone script: safe bidirectional repo↔global sync
```

## Sync rule

Edit files in this repo, but devbox reads from `$(devbox global path)`.
After changing files, sync to make them take effect:

```bash
# Option A (recommended): config-sync (detects conflicts, supports dry-run)
devbox global run config-sync

# Option B: rsync (incremental, shows changes)
rsync -ai devbox.json devbox.d devbox-global-config-sync devbox-global-update-flake "$(devbox global path)/"

# Option C: symlink (one-time setup, auto-syncs after)
ln -sf "$PWD/devbox.json" "$(devbox global path)/devbox.json"
ln -sfn "$PWD/devbox.d" "$(devbox global path)/devbox.d"
```

> **rsync trailing-slash trap**: `rsync devbox.d dest/` (no slash) → dest gets `devbox.d/`.
> `rsync devbox.d/ dest/` (with slash) → flattens `devbox.d/` contents into `dest/` root,
> breaking `devbox.json`'s `path:devbox.d/name` references. Prefer `config-sync`.

Then run `devbox global install` to install new/changed packages, and
`eval "$(devbox global shellenv --recompute)"` to update the current shell.
Run `devbox global run update-flake` to check / update flake packages.

### config-sync usage

Default: **dry-run** (preview only). Add `--sync` to apply.
Direction: **repo → global** (edit in repo, push to live).

```bash
devbox global run config-sync            # dry-run (default)
devbox global run config-sync -- --sync  # actually sync
```

Reverse: sync **global → repo** (after `config-pull` or emergency edit):

```bash
devbox global run config-sync -- --reverse            # dry-run reverse
devbox global run config-sync -- --reverse --sync     # actually apply reverse
```

Other options:
```
  -s, --sync        Apply changes (default is dry-run)
  -d, --diff        Show unified diff before syncing
  -i, --interactive Confirm each file before syncing
  -h, --help        Show this help
```

Conflict detection: warns when both sides diverged (repo and global both
modified independently), shows what the opposite direction would change.

## Important commands

| Command | What it does |
|---|---|
| `devbox global pull <URL>` | Pull config from GitHub |
| `devbox global push <URL>` | Push local config to GitHub |
| `devbox global run first-install` | Full setup: git → tmux → fonts → themes → neovim |
| `devbox global run config-edit` | Open devbox.json in $EDITOR |
| `devbox global run update-flake` | Run update-flake version checker |
| `devbox global run config-sync` | Sync repo ↔ global with conflict detection (dry-run by default, add `--sync` to apply) |
| `devbox global run python-install <pkg>` | pip install into managed venv |
| `devbox global run python-update` | Upgrade all pip packages in venv |

## devbox.d/ flakes

16 local flake packages. Patterns found in their flake.nix files:

- **Simple fetch + install** (blesh, gemini-cli-bin, agent-browser): fetch tarball
  from GitHub releases, copy to store, provide helper script.
- **Npm build** (aicommits): `fetchFromGitHub` + `buildNpmPackage`. Uses
  `dontNpmInstall = true` + manual installPhase because `prepack` needs pnpm.
- **Overlay on nixpkgs** (bun): replace nixpkgs' bun with baseline build (no AVX)
  for VirtualBox compat.
- **Wrap nixpkgs** (neovim): neovim-nightly-overlay + wrapNeovim for Lua/Python/Ruby/Node.
- **Override source** (opencode, skills): fetchFromGitHub + overrideAttrs to swap source.
  Uses `fakeHash` for first-time builds — uncomment fakeHash, run `devbox global update`,
  capture real hash, paste back.
- **Build Python from source** (whichllm): fetchFromGitHub + buildPythonPackage.
  Builds both the app and its missing PyPI deps (dbgpu) inline in the flake.
- **Input-based composition** (neovim, skills): external flake inputs composed in outputs.
- **Inline Perl tree-sitter build** (codegraph, graphify): build a bundled
  tree-sitter-perl as a Python package within the main flake (no separate flake
  input). Source fetched from `tree-sitter-perl/tree-sitter-perl` (official org,
  not `ganezdragon` fork — that fork only has tags up to v1.1.1). **Must include**
  `tree-sitter generate src/grammar.json` in `preBuild` + `pkgs.tree-sitter` in
  `nativeBuildInputs` because the official source doesn't ship pre-generated
  `parser.c`.

### Fork perl branch maintenance

**codegraph** (`rbelem/codegraph`, branch `v1.1.x-perl`, formerly `v1.0.x-perl`)
and **graphify** (`rbelem/graphify`, branch `v9-perl`) are rbelem forks that add
Perl extraction on top of upstream releases. After `update-flake --all` bumps
their version strings, the perl branches must be updated to match:

1. `cd $(ghq root)/github.com/rbelem/<repo>` and `git checkout <branch>`
2. `git fetch upstream --tags` (upstream = colbymchenry/codegraph or safishamsi/graphify)
3. `git merge v<new-version>` — resolve conflicts:
   - **CHANGELOG.md**: keep upstream changelog entries + restore Perl entry at top
   - **pyproject.toml** (graphify): keep `tree-sitter-perl` dep + `perl = [...]` extra; combine `all = [...]` lists
4. `git push origin <branch>`

**Codegraph perl branch naming**: The perl branch follows upstream's major.minor
series (e.g. `v1.0.x-perl` for 1.0.x, `v1.1.x-perl` for 1.1.x). When upstream
bumps past the current series, create a new perl branch for the new series and
merge there. Old series branches are kept but not active.

Local clones live under `ghq root` with remotes `origin` (rbelem) and `upstream`
(the original author). Force-push is fine — these are personal forks.

- **VirtualBox compat**: bun and opencode use `bun-linux-x64-baseline` (no AVX/AVX2)
  to avoid crashes on VMs.
- **NixOS vs non-NixOS**: init_hook conditionally sets `NIX_LD` only on NixOS.
  Flatpak setup branches on NixOS vs non-NixOS for font paths.
- **init_hook order**: non-interactive short-circuit → ble.sh → starship → zoxide
  (aliases `cd` to `z`) → fzf → `set -o vi` → atuin → bash completions → Python
  venv → ble-attach.
- **Python venv**: `$VENV_DIR` = `~/.local/share/devbox/global/python-venv`.
  Auto-activated in init_hook. Managed via `python-install`/`python-update` scripts.
- **Git config is elaborate**: `setup-git` script is the longest. Sets up delta
  (`calochortus-lyallii` theme), per-domain credential helpers (cache + oauth for
  GitHub, cache + manager for Azure DevOps), difftastic, vimdiff, per-repo
  includeif by scanning `ghq root`. All credential helpers accumulate — no dedup.
- **Bash-centric**: vi mode, ble.sh line editor, starship prompt, fzf, zoxide, atuin history.
  No zsh/fish.

## Scripts reference

All run via `devbox global run <name>`:

- `config-push` / `config-pull` — sync devbox.json to/from GitHub
- `config-sync` — runs `devbox-global-config-sync` (bidirectional repo↔global with conflict detection, supports `--dry-run`, `--diff`, `--reverse`, `--interactive`, `--sync`)
- `update-flake` — runs `devbox-global-update-flake` script (parses flake.nix for
  version + GitHub source, queries gh API for latest, prints color table).
  **Pitfall**: `devbox global run update-flake` uses the current shellenv which
  may not have `gh` in PATH. If it shows all packages as "unknown", run
  `eval "$(devbox global shellenv --recompute)"` first, then run the script
  directly from `$(devbox global path)/devbox-global-update-flake`.
- `setup-git` — full git config (identity, aliases, delta, difftastic, credential helpers, includeif)
- `setup-tmux` — clone gpakosz/.tmux + symlink local conf
- `setup-nerd-fonts` — add Nerd Fonts dir to fontconfig
- `setup-themes` — clone Gogh, install Kanagawa terminal theme
- `setup-neovim` — clone nvchad-custom to ~/.config/nvim
- `setup-devbox` — create ~/.bashrc.d/90-devbox.sh for devbox init
- `setup-flatpak` — Flathub repos, font symlinks, flatpak overrides
- `setup-podman` — permissive container policy.json
- `setup-kde-secrets-service` — replace ksecretd with kwalletd5
- `python-install` / `python-update` — manage Python venv packages

## Chezmoi dotfiles

`.chezmoiroot` = `dotfiles/`. autoCommit + autoPush enabled.
`private_` prefix files = permission-sensitive (kde globalshortcuts, kwin rules, kxkbrc).

## Orchestrator workflow

### Role

Workflow manager for coding work. Plan, schedule, delegate, monitor, reconcile, and
verify specialist-agent work. Optimize for quality, speed, cost, and reliability.

### Available agents

| Agent | Lane | Best for |
|---|---|---|
| `@explorer` | Fast codebase recon | Discover what exists, glob/grep searches, structural questions |
| `@librarian` | External research | Library docs, API refs, GitHub examples, bug investigations |
| `@oracle` | Architecture & review | High-stakes decisions, complex debugging, code review, simplifications |
| `@designer` | UI/UX design | User-facing polish, responsive layouts, design systems, animations |
| `@fixer` | Bounded implementation | Well-defined multi-file changes, parallelizable work per folder |
| `@council` | Multi-model consensus | Critical decisions needing 2+ model perspectives |
| `@observer` | Visual analysis | Images, screenshots, PDFs, diagrams |

### Workflow

1. **Understand** — parse explicit + implicit needs
2. **Path selection** — evaluate approach by quality, speed, cost
3. **Delegation check** — match lanes, dispatch background tasks, reuse sessions
4. **Plan & parallelize** — build work graph, independent lanes run now, dependent waits
5. **Verify** — run diagnostics, route validation to right lanes, confirm success

### Background task model

- Spawn independent specialists as background tasks
- Track task IDs with specialist, objective, state
- Continue orchestration while tasks run (planning, scheduling, synthesis)
- Completion events resume you — don't poll unless dependent
- Never duplicate, undermine, or race a running lane
- Cancellation is not rollback — reconcile partial changes before replacing

### Communication

- Answer directly, no preamble or flattery
- Brief delegation notices ("Checking via @librarian...")
- Push back when approach is problematic — state concern + alternative concisely

### CodeGraph preferences

Prefer CodeGraph MCP tools over grep/Read for structural questions:
- `codegraph_context` — first call for "how does X work" questions
- `codegraph_trace` — trace call paths from X to Y in one call
- `codegraph_impact` — what breaks if changing Z
- `codegraph_explore` — see several symbols' source grouped
- Trust results from full AST parse; don't re-verify with grep
