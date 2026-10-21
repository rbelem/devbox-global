#!/usr/bin/env bash
# The checks this repo runs, in one place.
#
# .githooks/pre-commit (the fast local signal) and
# .github/workflows/checks.yml (the gate on every push and PR) both call this
# script, so the local and the CI policy cannot drift apart.
#
#   1. detection contract  - the table bin/update-flake prints against the
#                             recorded upstream data (offline, no network)
#   2. detection heuristics - the shapes a wrong answer would hide
#   3. version spelling    - the version written the way the flake spells it
#   4. hash resolution     - every hash goes back into its own attribute
#   5. disable-package     - the three-file disable procedure
#   6. flake lint          - statix + a nix parse of every devbox.d/*/flake.nix
#
# The lint has a ratchet: a parse error always fails, a statix finding fails
# only outside tests/known-lint-findings.txt. The findings in that list are
# pre-existing; a new one is a regression.
set -uo pipefail

cd "$(git rev-parse --show-toplevel)" || exit 1

status=0

run() {
    local name="$1"
    shift
    echo "--- $name"
    if "$@"; then
        echo "--- $name: ok"
    else
        echo "--- $name: FAILED" >&2
        status=1
    fi
}

run "detection contract" bash tests/detection/run.sh
run "detection heuristics" bash tests/detection/heuristics.sh
run "version spelling" bash tests/update/version-spelling.sh
run "hash resolution" bash tests/update/hash-resolution.sh
run "disable-package" bash tests/disable-package.sh

# The flake lint. The findings per file come out of vet-flakes as
# "FAIL <file>" followed by "  statix: ..." or "  parse: ..." lines.
lint_findings() {
    local kind="$1"
    bash bin/vet-flakes 2>&1 \
        | sed -e 's/\x1b\[[0-9;]*m//g' \
        | awk -v kind="$kind:" '
            /^FAIL /{ file = $2; next }
            /^  (statix|parse):/ { if (file != "" && $1 == kind) print file }
        ' | sort -u
}

if command -v statix >/dev/null 2>&1 && command -v nix-instantiate >/dev/null 2>&1; then
    echo "--- flake lint"
    parse_failures="$(lint_findings parse)"
    statix_failures="$(lint_findings statix)"
    new_statix=""
    while read -r file; do
        [[ -z "$file" ]] && continue
        if ! grep -qxF "$file" tests/known-lint-findings.txt; then
            new_statix="$new_statix$file"$'\n'
        fi
    done <<< "$statix_failures"

    if [[ -n "$parse_failures" || -n "$new_statix" ]]; then
        echo "--- flake lint: FAILED" >&2
        [[ -n "$parse_failures" ]] && printf '    parse error: %s\n' $parse_failures >&2
        [[ -n "$new_statix" ]] && printf '    new statix finding: %s\n' $new_statix >&2
        status=1
    else
        echo "--- flake lint: ok (only known findings)"
    fi
else
    echo "--- flake lint: statix or nix unavailable - skipped" >&2
fi

exit $status
