#!/usr/bin/env bash
# Test bin/disable-package.
#
# Disabling a package is a three-file edit — devbox.json, the detection
# contract and the skipped list — and every one of the three has to land.
# This runs the script against a scratch copy of the three files and asserts
# that all three change, that a second run changes nothing, and that an
# unknown package is refused.
#
# Usage: tests/disable-package.sh
set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(cd "$HERE/.." && pwd)"

WORK="$(mktemp -d "${TMPDIR:-/tmp}/disable-package.XXXXXX")"
trap 'rm -rf "$WORK"' EXIT

failures=0
ok() { printf 'ok   %s\n' "$1"; }
fail() { printf 'FAIL %s\n' "$1" >&2; failures=$((failures + 1)); }

# A scratch repo: the three files the script touches, plus the package dir.
# The entries are padded the way devbox.json pads them — the "{}" of every
# enabled entry sits in column 43.
PKG="probe-pkg"
mkdir -p "$WORK/root/devbox.d/$PKG" "$WORK/root/tests/detection"
: > "$WORK/root/devbox.d/$PKG/flake.nix"
cat > "$WORK/root/devbox.json" <<EOF
{
  "packages": {
    "fzf":                                "latest",
    "path:devbox.d/$PKG":            {},
    "path:devbox.d/other-pkg":            {}
  }
}
EOF
printf '# Contract for the update-flake detection.\n%s\tsome/repo\tasset\tv\t0\t1.0.0\t1.0.0\tX\n%s\tother/repo\tsource\tv\t0\t2.0.0\t2.0.0\tX\n' \
    "$PKG" "other-pkg" > "$WORK/root/tests/detection/expected.tsv"
printf '%s\n' "other-pkg" > "$WORK/root/tests/detection/expected-skipped.txt"

TAB="$(printf '\t')"

# --- the three edits land -------------------------------------------------
if bash "$REPO/bin/disable-package" "$PKG" --root "$WORK/root" > "$WORK/out.txt" 2>&1; then
    ok "the script exits 0 on a known package"
else
    fail "the script exits 0 on a known package"
    cat "$WORK/out.txt" >&2
fi

if grep -q "^[[:space:]]*//\"path:devbox.d/$PKG\"" "$WORK/root/devbox.json"; then
    ok "devbox.json: the package is commented out"
else
    fail "devbox.json: the package is commented out"
fi

# The disabled entries keep the "{}" two columns right of the enabled ones.
brace_column="$(awk -v pkg="$PKG" '$0 ~ ("//\"path:devbox.d/" pkg "\"") { print index($0, "{"); exit }' "$WORK/root/devbox.json")"
enabled_column="$(awk '$0 ~ /"path:devbox.d\/other-pkg"/ { print index($0, "{"); exit }' "$WORK/root/devbox.json")"
if [[ "$brace_column" == "$((enabled_column + 2))" ]]; then
    ok "devbox.json: the commented entry keeps the house alignment"
else
    fail "devbox.json: the commented entry keeps the house alignment (brace at $brace_column, enabled at $enabled_column)"
fi

if ! grep -q "^$PKG$TAB" "$WORK/root/tests/detection/expected.tsv"; then
    ok "expected.tsv: the row is gone"
else
    fail "expected.tsv: the row is gone"
fi

if grep -q "^other-pkg$TAB" "$WORK/root/tests/detection/expected.tsv"; then
    ok "expected.tsv: the other rows are untouched"
else
    fail "expected.tsv: the other rows are untouched"
fi

if grep -qx "$PKG" "$WORK/root/tests/detection/expected-skipped.txt"; then
    ok "expected-skipped.txt: the name is there"
else
    fail "expected-skipped.txt: the name is there"
fi

# The skipped list stays sorted.
if [[ "$(cat "$WORK/root/tests/detection/expected-skipped.txt")" == "$(sort "$WORK/root/tests/detection/expected-skipped.txt")" ]]; then
    ok "expected-skipped.txt: the list is sorted"
else
    fail "expected-skipped.txt: the list is sorted"
fi

# --- a second run changes nothing -----------------------------------------
after_json="$(cat "$WORK/root/devbox.json")"
after_tsv="$(cat "$WORK/root/tests/detection/expected.tsv")"
after_skipped="$(cat "$WORK/root/tests/detection/expected-skipped.txt")"

if bash "$REPO/bin/disable-package" "$PKG" --root "$WORK/root" > "$WORK/out2.txt" 2>&1; then
    ok "a second run exits 0"
else
    fail "a second run exits 0"
fi
if [[ "$(cat "$WORK/root/devbox.json")" == "$after_json" \
   && "$(cat "$WORK/root/tests/detection/expected.tsv")" == "$after_tsv" \
   && "$(cat "$WORK/root/tests/detection/expected-skipped.txt")" == "$after_skipped" ]]; then
    ok "a second run changes nothing"
else
    fail "a second run changes nothing"
fi

# --- an unknown package is refused ----------------------------------------
if bash "$REPO/bin/disable-package" "no-such-pkg" --root "$WORK/root" > "$WORK/out3.txt" 2>&1; then
    fail "an unknown package is refused"
else
    ok "an unknown package is refused"
fi
if grep -q "not a package" "$WORK/out3.txt"; then
    ok "the refusal says why"
else
    fail "the refusal says why"
fi

if [[ "$(cat "$WORK/root/devbox.json")" == "$after_json" ]]; then
    ok "a refused package leaves devbox.json alone"
else
    fail "a refused package leaves devbox.json alone"
fi

if [[ $failures -gt 0 ]]; then
    printf '\n%d failure(s)\n' "$failures" >&2
    exit 1
fi

printf '\nOK: disabling a package edits all three files, once\n'
