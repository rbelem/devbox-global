#!/usr/bin/env bash
# Test the hash resolution of bin/update-flake.
#
# A flake can carry several hash attributes: the source hash of the package
# and the hash of a dependency built from the same source tree. The build
# error names the fake hash it rejected, so the real hash must go back into
# THAT attribute. When every attribute shared one fake, the paste-back could
# only guess and wrote a dependency's hash into the source attribute - the
# flake then built the wrong thing under the right name.
#
# The test runs the updater against a synthetic flake with two hash
# attributes and a fake `nix` that reports a hash mismatch for one of them.
#
# Usage: tests/update/hash-resolution.sh
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(cd "$HERE/../.." && pwd)"
FIXTURES="$HERE/../detection/fixtures"
WORK="$(mktemp -d "${TMPDIR:-/tmp}/update-flake-hashes.XXXXXX")"
trap 'rm -rf "$WORK"' EXIT

GLOBAL="$WORK/global"
FLAKE="$GLOBAL/devbox.d/whichllm"
mkdir -p "$FLAKE" "$WORK/bin"

cat > "$GLOBAL/devbox.json" <<'JSON'
{
  "packages": {
    "path:devbox.d/whichllm": {}
  }
}
JSON

# Two hash attributes: the source hash of the package and the hash of a
# dependency built from the same tree. The source hash comes first in the
# file, the dependency's hash second.
cat > "$FLAKE/flake.nix" <<'NIX'
{
  description = "whichllm - two hash attributes";
  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  outputs = { self, nixpkgs }:
    let
      version = "0.5.20";
      srcHash = "sha256-wipPzJzxsHc3P/ZDjEWe7yXcVBZ9zrTc3yKlDwbAlRk=";
    in {
      packages = forAllSystems (pkgs: rec {
        whichllm = pkgs.python3Packages.buildPythonApplication rec {
          pname = "whichllm";
          inherit version;
          src = pkgs.fetchFromGitHub {
            owner = "Andyyyy64";
            repo = "whichllm";
            rev = "v${version}";
            hash = srcHash;
          };
          dependencies = [
            (pkgs.python3Packages.buildPythonPackage rec {
              pname = "dbgpu";
              version = "2025.12";
              hash = "sha256-1KL9w2/1/yrzfo/Yo+B0CrKvc8xeD9oZn9/z1vFob04=";
            })
          ];
        };
        default = whichllm;
      });
    };
}
NIX

# The fake nix: report a hash mismatch for the fake hash that is still in the
# file, naming it as the "specified" value the way nix does. The "got" value
# carries the same discriminator, so the test can tell which attribute got
# which hash.
cat > "$WORK/bin/nix" <<'NIX'
#!/usr/bin/env bash
set -uo pipefail
flake="flake.nix"
[[ -f "$flake" ]] || flake="devbox.d/whichllm/flake.nix"
fake="$(grep -oE 'sha256-AAAA[A-Za-z0-9+/=]*' "$flake" | tail -1)"
[[ -n "$fake" ]] || exit 0
disc="${fake:11:1}"   # "sha256-AAAA" is 11 characters
cat <<EOF
error: hash mismatch in fixed-output derivation '/nix/store/xxx-source.drv':
         specified: $fake
            got:    sha256-GOT${disc}AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=
error: Cannot build '/nix/store/xxx-source.drv'.
EOF
exit 1
NIX
chmod +x "$WORK/bin/nix"

export UPDATE_FLAKE_FIXTURES="$FIXTURES"
export UPDATE_FLAKE_TEST_ROOT="$GLOBAL"
export UPDATE_FLAKE_ENABLED="$WORK/enabled.txt"
echo "whichllm" > "$WORK/enabled.txt"
export PATH="$WORK/bin:$HERE/../detection/fakebin:$PATH"

bash "$REPO/bin/update-flake" whichllm > "$WORK/output.txt" 2>&1 || true

failures=0
check() {
    local what="$1" pattern="$2"
    if grep -qE "$pattern" "$FLAKE/flake.nix"; then
        echo "ok   $what"
    else
        echo "FAIL $what: no line matches $pattern"
        sed 's/^/     /' "$FLAKE/flake.nix"
        failures=$((failures + 1))
    fi
}

# The source hash was the first fake (discriminator A), the dependency's the
# second (discriminator B). Each must come back with ITS OWN discriminator:
# the paste-back that writes the first fake in the file would put the
# dependency's hash into the source attribute.
check "the source hash kept its own value" 'srcHash = "sha256-GOT[A].*";'
check "the dependency hash kept its own value" 'hash = "sha256-GOTB.*";'

# The version bump and the audit comment must survive the resolution.
check "the version was bumped" 'version = "0.5.21";'

if grep -qE 'sha256-AAAA' "$FLAKE/flake.nix"; then
    echo "FAIL a fake hash is still in the file"
    failures=$((failures + 1))
else
    echo "ok   no fake hash is left"
fi

if [[ $failures -gt 0 ]]; then
    echo
    echo "$failures check(s) failed"
    echo "--- updater output ---"
    sed 's/^/  /' "$WORK/output.txt"
    echo "--- flake ---"
    sed 's/^/  /' "$FLAKE/flake.nix"
    exit 1
fi
echo
echo "OK: every hash goes back into the attribute it belongs to"
