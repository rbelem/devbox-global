#!/usr/bin/env bash
# Regression test for the detection heuristics that a wrong answer would
# hide: the release line of a multi-stream project, and the version of a
# package that has none of its own.
#
# The flakes below are synthetic - no enabled flake in devbox.d has these
# shapes - but each one is a way the detection could pick the wrong answer
# instead of saying "unknown".
#
# Usage: tests/detection/heuristics.sh
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(cd "$HERE/../.." && pwd)"
WORK="$(mktemp -d "${TMPDIR:-/tmp}/update-flake-heuristics.XXXXXX")"
trap 'rm -rf "$WORK"' EXIT

GLOBAL="$WORK/global"
mkdir -p "$GLOBAL/devbox.d/multistream" "$GLOBAL/devbox.d/multistream2" \
    "$GLOBAL/devbox.d/siblingver"

# The synthetic flakes pin the newest release of each line as recorded in the
# fixture, so refreshing the fixture cannot rot this test into asserting an
# out-of-date version. __SDK__ / __DRIVER__ are filled in below.
read -r SDK_NEWEST DRIVER_NEWEST < <(python3 - "$HERE/fixtures/trycua__cua.json" <<'PY'
import json, re, sys

releases = json.load(open(sys.argv[1]))["releases"]
def newest(prefix):
    # No pre-release filter: every cua-driver-rs release is flagged as one,
    # and the helper needs a real version from that line to tempt a detector.
    return max(
        tuple(int(p) for p in m.groups())
        for m in (re.match(prefix + r"(\d+)\.(\d+)\.(\d+)$", r["tag_name"])
                  for r in releases)
        if m
    )
print(".".join(map(str, newest("cua-sdk-v"))),
      ".".join(map(str, newest("cua-driver-rs-v"))))
PY
)

cat > "$GLOBAL/devbox.json" <<'JSON'
{
  "packages": {
    "path:devbox.d/multistream": {},
    "path:devbox.d/multistream2": {},
    "path:devbox.d/siblingver": {}
  }
}
JSON

# The project publishes two lines (cua-sdk-v and cua-driver-rs-v). A helper
# attribute that carries the other line's URL must not move the flake onto
# that line: the package installs the cua-sdk-v asset. The helper points at
# the other line's newest version, newer than the pin, so a detection that
# ignored the line would report an update.
cat > "$GLOBAL/devbox.d/multistream/flake.nix" <<'NIX'
{
  description = "multistream - helper binary declared before the package src";
  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  outputs = { self, nixpkgs }:
    let
      version = "__SDK__";
      driverVersion = "__DRIVER__";
      binary = pkgs.fetchurl {
        url = "https://github.com/trycua/cua/releases/download/cua-driver-rs-v${driverVersion}/cua-driver-rs-${driverVersion}-linux-x86_64-binary.tar.gz";
        hash = "sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
      };
    in {
      packages = forAllSystems (pkgs: rec {
        multistream = pkgs.stdenv.mkDerivation {
          pname = "multistream";
          inherit version;
          src = pkgs.fetchurl {
            url = "https://github.com/trycua/cua/releases/download/cua-sdk-v${version}/cua-cli-${version}-linux-x64.tar.gz";
            hash = "sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
          };
        };
        default = multistream;
      });
    };
}
NIX

# The same, with the helper attribute inside the package's own scope.
cat > "$GLOBAL/devbox.d/multistream2/flake.nix" <<'NIX'
{
  description = "multistream2 - helper attribute inside the package scope";
  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  outputs = { self, nixpkgs }:
    let
      version = "__SDK__";
      driverVersion = "__DRIVER__";
    in {
      packages = forAllSystems (pkgs: rec {
        multistream2 = pkgs.stdenv.mkDerivation {
          pname = "multistream2";
          inherit version;
          binary = pkgs.fetchurl {
            url = "https://github.com/trycua/cua/releases/download/cua-driver-rs-v${driverVersion}/cua-driver-rs-${driverVersion}-linux-x86_64-binary.tar.gz";
            hash = "sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
          };
          src = pkgs.fetchurl {
            url = "https://github.com/trycua/cua/releases/download/cua-sdk-v${version}/cua-cli-${version}-linux-x64.tar.gz";
            hash = "sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
          };
        };
        default = multistream2;
      });
    };
}
NIX

python3 - "$SDK_NEWEST" "$DRIVER_NEWEST" \
    "$GLOBAL/devbox.d/multistream/flake.nix" \
    "$GLOBAL/devbox.d/multistream2/flake.nix" <<'PY'
import sys

sdk, driver, *paths = sys.argv[1:]
for path in paths:
    text = open(path).read()
    open(path, "w").write(text.replace("__SDK__", sdk).replace("__DRIVER__", driver))
PY

# The package pins a source tag but has no version attribute of its own and
# does not inherit one. A sibling package's version is not this package's
# version: the answer is "unknown", not the sibling's number.
cat > "$GLOBAL/devbox.d/siblingver/flake.nix" <<'NIX'
{
  description = "siblingver - no version of its own, a sibling has one";
  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  outputs = { self, nixpkgs }:
    let
      siblingVersion = "0.4.0";
    in {
      packages = forAllSystems (pkgs: rec {
        sibling = pkgs.stdenv.mkDerivation {
          pname = "sibling";
          version = siblingVersion;
        };
        siblingver = pkgs.stdenv.mkDerivation {
          pname = "siblingver";
          src = pkgs.fetchFromGitHub {
            owner = "trycua";
            repo = "cua";
            rev = "cua-sdk-v0.5.0";
            hash = "sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
          };
        };
        default = siblingver;
      });
    };
}
NIX

export UPDATE_FLAKE_FIXTURES="$HERE/fixtures"
export PATH="$HERE/fakebin:$PATH"

python3 "$REPO/bin/flake-detect.py" --global-dir "$GLOBAL" > "$WORK/detected.tsv"

failures=0

check() {
    local flake="$1" field="$2" want="$3"
    local got
    got="$(awk -F'\t' -v name="$flake" '$1 == name { print $0 }' "$WORK/detected.tsv" \
        | cut -f"$field")"
    if [[ "$got" == "$want" ]]; then
        echo "ok   $flake $field = $got"
    else
        echo "FAIL $flake $field: expected '$want', got '$got'"
        failures=$((failures + 1))
    fi
}

# flake  repo  origin  kind  prefix  major  installed_raw  installed  latest  relation
check multistream 5 cua-sdk-v
check multistream 9 "$SDK_NEWEST"
check multistream 10 up-to-date
check multistream2 5 cua-sdk-v
check multistream2 9 "$SDK_NEWEST"
check multistream2 10 up-to-date
check siblingver 8 unknown
check siblingver 9 unknown
check siblingver 10 unknown

if [[ $failures -gt 0 ]]; then
    echo
    echo "$failures check(s) failed"
    echo "--- detected ---"
    cat "$WORK/detected.tsv"
    exit 1
fi
echo
echo "OK: the release line and the package's own version are detected"
