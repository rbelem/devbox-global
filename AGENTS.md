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

> `rsync devbox.d dest/` (no trailing slash) copies the directory itself.
> `rsync devbox.d/ dest/` (with slash) copies contents into dest — wrong.

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

## Key quirks

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
  version + GitHub source, queries gh API for latest, prints color table)
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
