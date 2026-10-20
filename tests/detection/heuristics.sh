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
# that line: the package installs the cua-sdk-v asset.
cat > "$GLOBAL/devbox.d/multistream/flake.nix" <<'NIX'
{
  description = "multistream - helper binary declared before the package src";
  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  outputs = { self, nixpkgs }:
    let
      version = "0.5.0";
      binary = pkgs.fetchurl {
        url = "https://github.com/trycua/cua/releases/download/cua-driver-rs-v${version}/cua-driver-rs-${version}-linux-x86_64-binary.tar.gz";
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
      version = "0.5.0";
    in {
      packages = forAllSystems (pkgs: rec {
        multistream2 = pkgs.stdenv.mkDerivation {
          pname = "multistream2";
          inherit version;
          binary = pkgs.fetchurl {
            url = "https://github.com/trycua/cua/releases/download/cua-driver-rs-v${version}/cua-driver-rs-${version}-linux-x86_64-binary.tar.gz";
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
check multistream 9 0.5.0
check multistream 10 up-to-date
check multistream2 5 cua-sdk-v
check multistream2 9 0.5.0
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
