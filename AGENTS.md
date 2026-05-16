# devbox-global

Personal devbox global config (Rodrigo Belem). Declares entire CLI dev
environment — Nix packages, dotfiles, shell config, editor — installable on any
Linux machine via `devbox global pull`.

## Repo structure

```
devbox.json              # global package + script declarations
devbox.lock              # pinned nixpkgs versions (stale, 2023)
devbox.d/<name>/         # 15 flake-based packages (referenced path:devbox.d/<name>)
dotfiles/                # chezmoi root (.chezmoiroot = dotfiles)
devbox-global-update-flake  # standalone script: check flake versions vs GitHub
```

## Sync rule

Edit files in this repo, but devbox reads from `$(devbox global path)`.
After changing `devbox.json` or `devbox.d/`, sync to make them take effect:

```bash
# Option A: flat copy
cp devbox.json "$(devbox global path)/devbox.json"
cp -r devbox.d "$(devbox global path)/"

# Option B: symlink (one-time setup)
ln -sf "$PWD/devbox.json" "$(devbox global path)/devbox.json"
ln -sfn "$PWD/devbox.d" "$(devbox global path)/devbox.d"
```

Then run `devbox global run update-flake` if flake hashes changed, or
`devbox global shellenv --reinit` for package/script changes.

## Important commands

| Command | What it does |
|---|---|
| `devbox global pull <URL>` | Pull config from GitHub |
| `devbox global push <URL>` | Push local config to GitHub |
| `devbox global run first-install` | Full setup: git → tmux → fonts → themes → neovim |
| `devbox global run config-edit` | Open devbox.json in $EDITOR |
| `devbox global run update-flake` | Run update-flake version checker |
| `devbox global run python-install <pkg>` | pip install into managed venv |
| `devbox global run python-update` | Upgrade all pip packages in venv |

## devbox.d/ flakes

15 local flake packages. Patterns found in their flake.nix files:

- **Simple fetch + install** (blesh, gemini-cli-bin, agent-browser): fetch tarball
  from GitHub releases, copy to store, provide helper script.
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
