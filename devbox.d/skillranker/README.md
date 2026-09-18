# skillranker flake

Nix package for [Dicklesworthstone/skillranker](https://github.com/Dicklesworthstone/skillranker)
(`sr`), built from a pinned main-HEAD commit with the upstream-pinned nightly Rust
toolchain.

```bash
nix build .            # or: nix profile install /home/rodrigo/Projects/skillranker-flake
result/bin/sr doctor --config
```

## Why this flake is unusual

Three upstream quirks force custom handling:

1. **Nightly toolchain required.** Upstream pins `nightly-2026-08-31`; stable cargo
   (≤1.98) rejects frankensearch's `default-features = false` workspace
   inheritance while parsing the workspace. `makeRustPlatform` wires the oxalica
   nightly through vendoring AND build.
2. **frankensearch workspace is unparseable from a clean checkout.** Its
   `tools/optimize_params` member path-deps on `../../../fast_cmaes` (a sibling
   repo, outside the tree). That member isn't in skillranker's dep graph, so
   `frankensearchPatched` deletes it from `workspace.members`.
3. **nixpkgs can't vendor these git deps.** `importCargoLock` and
   `fetchCargoVendor` both run `cargo metadata` over the git workspaces and die
   on (2). Instead, `prePatch` rewrites the git deps to **path deps** against
   hash-verified `fetchgit` trees, and `./Cargo.lock.pathdeps` (committed here)
   is the same lock with all `source = "git+…"` lines stripped. `cargoLock`
   then only vendors registry crates.

## Update procedure (bump to a new upstream rev)

1. Set the new rev in **both** `skillranker-src.url` and the `rev` variable.
2. Refresh both lockfiles from the new rev:
   ```bash
   curl -sL https://codeload.github.com/Dicklesworthstone/skillranker/tar.gz/<REV> \
     | tar xz --strip-components=1 -C /tmp/sr-new
   cp /tmp/sr-new/Cargo.lock ./Cargo.lock
   sed '/source = "git+/d' /tmp/sr-new/Cargo.lock > ./Cargo.lock.pathdeps
   ```
3. Check the new lock for **new/changed git deps** (name, rev, hash):
   `grep -A2 'source = "git' /tmp/sr-new/Cargo.lock` — update the two
   `fetchgit` blocks' revs and hashes (fake-hash loop: build, paste real hash).
   If upstream's frankensearch gains/renames workspace members with external
   path deps, adjust the `sed` in `frankensearchPatched`.
4. `nix build` — first run compiles (~6 min), later runs are cached.

## Status notes (as of 2026-09-18, rev 3fe85c4)

- Upstream main implements **only `sr doctor --config`**; the README's
  `rank`/`demo`/`hook`/`tui` commands are not in main yet. Rebuild after upstream
  adds them — the flake needs no changes for that.
- Only `x86_64-linux` is build-verified; darwin/aarch64 are exposed but untested.
- `doCheck = false` (upstream test harness isn't sandbox-hermetic).
