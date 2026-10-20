# update-flake detection test

An offline test for the version detection in `bin/update-flake`.

`bin/update-flake` prints a table of every enabled flake with the version it
pins today and the newest version upstream published. That table was wrong for
a third of the flakes: it picked the wrong repository, the wrong release line,
or the wrong `version` attribute. This directory holds the machinery that
pins the table down.

## Running it

```bash
tests/detection/run.sh
```

The script is run against a throwaway "devbox global" directory with a fake
`gh`, `devbox` and `curl` on `PATH`, so the run touches no network and always
produces the same table. The table is compared with the contract in
`expected.tsv`; any difference is printed and the run fails.

`run.sh --keep` leaves the throwaway directory behind for inspection.

## The files

| File                  | What it is                                                        |
|-----------------------|-------------------------------------------------------------------|
| `expected.tsv`        | The contract: one row per enabled flake, with the repository, the release line, the installed version, the newest upstream version and the status the table must show. |
| `expected-skipped.txt`| The flake directories that are not enabled in `devbox.json`.       |
| `oracle.py`           | An independent implementation of the "newest version in a line" rule, computed from the fixtures. It shares no code with the script and re-checks the contract against the recorded upstream data. |
| `heuristics.sh`       | Regression test for the shapes a wrong answer would hide: a project with two release lines, and a package with no version of its own. |
| `fixtures/`           | The recorded upstream data (releases, tags, default branch) per repository. |
| `capture-fixtures.py` | Refreshes `fixtures/` from the live GitHub API.                  |
| `trim-fixtures.py`    | Drops the release assets of the lines no flake tracks.           |
| `fakebin/`            | The fake `gh`, `devbox` and `curl` the test runs the script with. |
| `parse_table.py`      | Turns the printed table into a comparable TSV.                    |
| `compare.py`          | Compares the printed table with the contract.                     |

## The rule the contract encodes

A flake tracks one *line* of upstream versions: a tag prefix plus a major
version (`v` + `0` for `bsk` is `cli-v` + `0`, `v` + `2026` for
`hermes-agent`). The newest version in that line is:

1. The newest **release** in the line, preferring a stable one over a
   pre-release. A release published before the installed version is not a
   candidate: `microsoft/playwright-cli` carries playwright's own releases
   (v0.180.0, 2021) next to the CLI's (v0.1.22, 2026), and the older one sorts
   higher by semver.
2. Plus the **tags** inside the series of those releases, when a tag is newer
   than what we have: `zvec-ai/zvec-grep` tags v0.2.2 but only released v0.2.0.
   A flake that downloads a release asset cannot use such a tag - there is no
   asset to download (`trycua/cua` tags `cua-driver-rs-v0.37.0` but released
   v0.36.0).
3. When the line has no release at all, the tags are the only source
   (`monozukuri-ai/ezdwg` publishes tags without releases).

A version counts as a pre-release when its own name says so (`-rc.2`,
`-alpha.1`) or when the release object is flagged as one. The name wins:
`deepseek-ai/deepseek-harness` publishes `dsh-v0.1.5-rc.3` as a stable
release.

## How the detection decides

**The repository** the version is tracked against:

1. `# upstream: owner/repo` in the flake (a fork tracks its upstream).
2. The flake's own package - the package whose `pname` matches the flake
   name, else the package bound to `default`, else the first package in the
   file - and inside it, in this order:
   - `fetchFromGitHub { owner = ...; repo = ...; }`,
   - a `releases/download/<tag>/...` URL,
   - `meta.homepage`.
3. Otherwise the flake input that carries the source: the input whose name
   matches the flake (`<flake>-src`) or whose repository matches the flake
   name, else the first input that is not nixpkgs.
4. `homepage`, or the first github URL in the file, as the last resort.

**The installed version**:

1. The `version` attribute of that package, when it is a literal.
2. The `version` attribute of the enclosing let block, when the package does
   `inherit version` - a sibling package's version is not this package's
   version.
3. The ref of a github input URL (`github:owner/repo/v1.2.3`).
4. `dynamic` when the attribute is interpolated (`0.1.0-main-${...}`).

**The release line**: the tag prefix and the major version of the installed
version.

1. `# release-prefix: cli-v` in the flake.
2. The prefix in the package's own `releases/download/<prefix>${version}` URL
   - the package's own artifact decides, so a helper attribute that carries
   a second binary of the same project cannot move the flake onto another
   release line.
3. The prefix in `rev = "<prefix>${version}"`.
4. The prefix embedded in the version attribute (`dsh-v0.2.1-alpha.1`).
5. `v`.

**The status**: `✓` up to date, `↓` an update is available, `↑` the flake is
ahead of upstream, `??` nothing to compare. The status carries a reason when
one applies:

- `(sha-pinned)` - the source is pinned to a commit SHA, so the version
  cannot move without the source moving with it. Such a flake is reported but
  never updated automatically.
- `(dynamic-version)` - the version attribute is interpolated.
- `(pre)` - the newest version in the line is a pre-release.

A `devbox.d/<flake>#<variant>` entry (devbox lets a package select one
attribute of a flake) resolves to the same flake directory: it is reported
with the flake's version, and it is not updated a second time.

## Refreshing the fixtures

```bash
python3 tests/detection/capture-fixtures.py    # needs an authenticated gh
python3 tests/detection/trim-fixtures.py
python3 tests/detection/oracle.py              # re-checks the contract
```

`oracle.py` prints the newest version per line computed from the freshly
recorded data. When it disagrees with `expected.tsv`, upstream published
something new: either update the contract (the new version is real) or revert
the fixture (the recording was wrong).
