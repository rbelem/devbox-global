# devbox-global

My personal development environment, kept as a package set rather than a pile of
dotfiles.

[Devbox](https://www.jetify.com/devbox/) resolves the environment from
`devbox.json`. Most packages come straight from the nixpkgs registry. The ones
that need patching, pinning or building differently live in `devbox.d/`, one Nix
derivation each, so every package is inspectable and reproducible instead of
implicit.

| | |
|---|---|
| Derivations in `devbox.d/` | 59, of which 39 are referenced by `devbox.json` |
| Nix | about 6,100 lines across `devbox.d/*/flake.nix` |
| Registry packages pinned in `devbox.json` | 57 |
| Maintenance scripts in `bin/` | 18 |
| Commits since 2023-04-18 | 1,067 |

## Why a derivation instead of a registry package

Most tools need nothing special. A few cases come up often enough to be worth
a file each, and they are the reason `devbox.d/` exists.

### Upstream ships a prebuilt binary, not source

`devbox.d/anydoc` wraps a CLI whose core is a prebuilt napi-rs native module.
The npm tarball and the platform-specific `.node` addon are fetched separately,
the addon is dropped into the package directory where the napi loader looks for
it, and `autoPatchelf` fixes the glibc linkage. `devbox.d/docling` and
`devbox.d/playwright-cli` take the same shape. Eight derivations need
`autoPatchelf` for a patched binary, nine set `dontBuild` because there is
nothing to compile, and three need both.

### Upstream wants to manage its own install

`devbox.d/blesh` installs ble.sh, whose own updater would happily overwrite a
Nix-managed tree. The derivation writes a `_ble_base_package_type=nix` marker
during `installPhase`, so ble.sh's updater declines to run and points at the
flake instead.

### The artifact is rebuilt under you

ble.sh also ships a nightly tarball, so the pinned hash goes stale on a
schedule that has nothing to do with the package version. `bin/update-flake`
tracks upstream releases, compares versions and rotates the hash, and the flake
comment records why the pin needs refreshing in the first place.

There is a fourth, cheaper pattern: `devbox.d/playwright-chromium-deps` holds
a single `result` symlink pointing straight at a nix store path. When a
derivation is not worth writing, pinning the store path is enough.

`docs/templates/cat-a-flake.nix` is the starting point for a new one. It marks
every per-bump edit point (version string, per-system asset name, per-system
SRI hash) and documents the hash-refresh trick: put a dummy literal in, build,
and paste the `got:` hash from the error.

## What the derivations cover

AI-agent CLIs and MCP servers, local search and retrieval tooling, browser and
document pipelines, language runtimes and editors, and the upstream packages
that need patching.

Twenty-nine of the 59 are `mkDerivation`s, and 23 of those fetch their own
source. The other thirty wrap an existing nixpkgs attribute for a specific
purpose, which is usually a `makeWrapper` or a `symlinkJoin`.

| | |
|---|---|
| `mkDerivation` | 29 (23 of which fetch their own source) |
| Fetch inputs: `fetchurl` / `fetchzip` / `fetchgit` | 28 / 2 / 1 |
| Custom `installPhase` | 37 |
| `meta` block | 54 |
| `nativeBuildInputs` declared | 38 |
| `makeWrapper` | 20 |
| `dontBuild` (prebuilt upstream) | 9 |
| `autoPatchelf` | 8 |
| `patchPhase` | 3 |
| Also builds `aarch64-linux` | 41 |
| Pulls an additional input flake | 39 |

## Tooling

`bin/` holds 18 scripts. Two of them are the ones that keep the packaging
honest.

**`bin/vet-flakes`** is a read-only lint over every `devbox.d/*/flake.nix`:
`statix check` for Nix lint, plus `nix-instantiate --parse` as an offline
syntax check, with PASS/FAIL/WARN per file. It deliberately does not run `nix
flake show` per flake, because that is slow and needs the network, and it does
not wire `nixfmt --check`, because the formatter is not installed here and `nix
fmt` needs a repo flake formatter, so wiring it would emit a false FAIL. The
header says how to drop it into a pre-commit hook or a CI step.

**`bin/update-flake`** checks upstream GitHub releases against the installed
versions, shows a comparison table, and updates the pinned version and hashes.
It fails fast when `gh` is missing or unauthenticated, because otherwise every
package silently reports `unknown`.

The rest are `setup-*` scripts for the individual pieces of the environment
(git, flatpak, podman, tmux, themes, nerd fonts, KDE secrets service, herdr,
bws) plus `config-sync`, `init-hook` and `post-install`.

## Conventions

- **Pinned inputs.** Every fetch carries a `sha256-...` SRI hash. No floating
  tags.
- **`meta` blocks.** 54 of the 59 derivations carry description, homepage,
  license, mainProgram and platforms.
- **Multi-arch.** 41 derivations build `aarch64-linux` as well as
  `x86_64-linux`.
- **Comments record the decision, not the mechanics.** Where a derivation does
  something unusual, the comment says why, and what breaks if you change it.
- **Bumps go through the tool.** Version and hash updates run through
  `bin/update-flake` rather than by hand.

## Using it

This is the global devbox profile, pulled with:

```sh
devbox global pull https://github.com/rbelem/devbox-global.git
```

`devbox.json` declares `env` and `shell` (an init hook plus the scripts
above), so the profile is self-contained.
