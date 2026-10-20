#!/usr/bin/env bash
# Test the version writing of bin/update-flake.
#
# The version of a flake lives in two places - a `version = "..."` attribute
# and the ref of a github input URL - and the two do not always use the same
# spelling: graphify pins the attribute as "0.9.91" and the input as
# "v0.9.91". Writing the wrong spelling into either place leaves the flake
# claiming a version its source does not have, and nothing complains until
# the build produces a binary that lies about its version.
#
# The version writing helpers are extracted from bin/update-flake (the block
# between the "Version writing" markers) and run against synthetic flakes.
#
# Usage: tests/update/version-spelling.sh
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(cd "$HERE/../.." && pwd)"
WORK="$(mktemp -d "${TMPDIR:-/tmp}/version-spelling.XXXXXX")"
trap 'rm -rf "$WORK"' EXIT

# ── Extract the helpers from the script under test ──
awk '/^# ── Version writing ──$/{inside=1; next} /^# ── end version writing ──$/{inside=0} inside' \
    "$REPO/bin/update-flake" > "$WORK/helpers.sh"
if ! grep -q "^write_version()" "$WORK/helpers.sh"; then
    echo "FAIL: could not extract the version writing helpers from bin/update-flake"
    exit 1
fi
# shellcheck source=/dev/null
source "$WORK/helpers.sh"

failures=0

# The per-flake facts the script keeps in associative arrays. They must be
# associative and declared: for an unset array bash evaluates the subscript
# arithmetically, and "flake" is not a number.
declare -A DET_PREFIX DET_FORK_SUFFIX

# ── The cases ──
# Each case: name, prefix, the flake file, the old version, the new version,
# and the lines the file must contain afterwards.
check() {
    local name="$1" fixture="$2" prefix="$3" old_ver="$4" new_ver="$5"
    local before="$WORK/$fixture"
    local after="$WORK/$fixture.after"
    shift 5

    DET_PREFIX["flake"]="$prefix"
    DET_FORK_SUFFIX["flake"]="-"

    cp "$before" "$after"
    if ! write_version "$after" "flake" "$old_ver" "$new_ver" >/dev/null; then
        echo "FAIL $name: nothing was written"
        failures=$((failures + 1))
        return
    fi

    local expected
    for expected in "$@"; do
        if ! grep -qF "$expected" "$after"; then
            echo "FAIL $name: expected to find: $expected"
            echo "     in:"
            sed 's/^/       /' "$after"
            failures=$((failures + 1))
            return
        fi
    done
    echo "ok   $name"
}

# graphify: the attribute is bare, the input URL carries the "v" prefix.
cat > "$WORK/graphify.nix" <<'NIX'
{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    graphify-src = {
      url = "github:safishamsi/graphify/v0.9.91";
      flake = false;
    };
  };
  outputs = { self, nixpkgs, graphify-src }:
    let
      version = "0.9.91";
    in { packages = {}; };
}
NIX
check graphify graphify.nix v 0.9.91 0.9.92 \
    'version = "0.9.92";' \
    'url = "github:safishamsi/graphify/v0.9.92";' \
    'graphify/v0.9.92'

# steel-takeoff: the attribute belongs to the package, the input URL carries
# the "v" prefix. Both must move.
cat > "$WORK/steel.nix" <<'NIX'
{
  inputs = {
    ezdwg-src = {
      url = "github:monozukuri-ai/ezdwg/v0.16.0";
      flake = false;
    };
  };
  outputs = { self, ezdwg-src }:
    let
      ezdwg = pkgs.python3Packages.buildPythonPackage rec {
        pname = "ezdwg";
        version = "0.16.0";
      };
    in { packages = { inherit ezdwg; }; };
}
NIX
check steel-takeoff steel.nix v 0.16.0 0.16.3 \
    'version = "0.16.3";' \
    'url = "github:monozukuri-ai/ezdwg/v0.16.3";' \
    'ezdwg/v0.16.3'

# deepseek-harness: the version attribute carries the tag prefix itself.
cat > "$WORK/deepseek.nix" <<'NIX'
{
  outputs = { self }:
    let
      version = "dsh-v0.2.1-alpha.1";
    in { packages = {}; };
}
NIX
check deepseek-harness deepseek.nix dsh-v 0.2.1-alpha.1 0.2.1-rc.2 \
    'version = "dsh-v0.2.1-rc.2";'

# bsk: the attribute is bare, the asset URL is a template.
cat > "$WORK/bsk.nix" <<'NIX'
{
  outputs = { self }:
    let
      version = "0.3.2";
    in {
      packages = {
        bsk = pkgs.stdenv.mkDerivation {
          pname = "bsk";
          inherit version;
          src = pkgs.fetchurl {
            url = "https://github.com/Tencent/BrowserSkill/releases/download/cli-v${version}/bsk-v${version}.tar.gz";
          };
        };
      };
    };
}
NIX
check bsk bsk.nix cli-v 0.3.2 0.3.3 \
    'version = "0.3.3";' \
    'releases/download/cli-v${version}/bsk-v${version}.tar.gz'

# hermes-agent: no version attribute at all, the input URL is the version.
cat > "$WORK/hermes.nix" <<'NIX'
{
  inputs = {
    hermes-agent.url = "github:NousResearch/hermes-agent/v2026.9.24";
  };
  outputs = { self, hermes-agent }: { packages = {}; };
}
NIX
check hermes-agent hermes.nix v 2026.9.24 2026.9.25 \
    'url = "github:NousResearch/hermes-agent/v2026.9.25";'

# opencode: the version attribute and a literal source ref. The ref names a
# tag, so it moves with the version - otherwise the flake builds the old
# source under the new name.
cat > "$WORK/opencode.nix" <<'NIX'
{
  outputs = { self }:
    let
      version = "2.0.27";
      rev = "v2.0.27";
    in { packages = {}; };
}
NIX
check opencode opencode.nix v 2.0.27 2.0.32 \
    'version = "2.0.32";' \
    'rev = "v2.0.32";'

if [[ $failures -gt 0 ]]; then
    echo
    echo "$failures case(s) failed"
    exit 1
fi
echo
echo "OK: every version spelling is written the way the flake spells it"
