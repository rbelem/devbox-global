# devbox-global

My personal development environment as a package set: `devbox.json` names the
packages, `devbox.d/<name>/flake.nix` is the derivation for the ones that need
pinning, patching or building differently.

## Where things are

| Path | What it holds |
|---|---|
| `devbox.d/<name>/flake.nix` | one derivation per package that needs more than the registry gives |
| `bin/update-flake` | compares every enabled flake against its upstream release and bumps it |
| `bin/flake-detect.py` | the detection half of `update-flake`: the repository, the version and the release line of a flake |
| `bin/vet-flakes` | a read-only lint over every `devbox.d/*/flake.nix` (statix + a nix parse) |
| `tests/detection/` | the offline test of the detection, and the contract it checks against |
| `tests/update/` | the offline tests of the update path (the version spelling, the hash resolution) |
| `tests/run-checks.sh` | every check in one place; the pre-commit hook and CI both call it |

**The rules the detection follows** (release line, newest version in a line,
pre-releases, SHA-pinned sources) are written down in
[`tests/detection/README.md`](tests/detection/README.md). Read it before
changing `bin/flake-detect.py` or the contract in
`tests/detection/expected.tsv`.

## Working on a flake

- **Bump a version** with `bin/update-flake <name>` - it writes the version,
  the hashes and the lock. The `update-flake-workflow` skill has the
  procedure, the hash fields per package and the recovery recipes.
- **The script edits the GLOBAL copy** (`$(devbox global path)`), not the
  repo. After a bump, pull the change back before doing anything else:
  `devbox global run config-sync -- --reverse --sync`. A forward sync in
  between clobbers the bump.
- **Manual edits** go the other way: edit the repo, then
  `devbox global run config-sync -- --sync` before `devbox global install`.
- **Stage only what you changed**: `git add devbox.d/<name>/flake.nix
  devbox.d/<name>/flake.lock`, never `git add -A`.

## Checks

```bash
bash tests/run-checks.sh     # everything, offline
```

The pre-commit hook (`.githooks/pre-commit`, installed with
`git config core.hooksPath .githooks`) and CI
(`.github/workflows/checks.yml`) run the same script. The detection tests
never touch the network: the upstream data they compare against is recorded
in `tests/detection/fixtures/`, refreshed with
`python3 tests/detection/capture-fixtures.py`.

A new statix finding in a flake fails the lint; the pre-existing ones are
listed in `tests/known-lint-findings.txt` and do not.
