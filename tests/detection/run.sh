#!/usr/bin/env bash
# Offline test for the version detection in bin/update-flake.
#
# The script under test is run against a throwaway "devbox global" directory
# with a fake gh/devbox/curl on PATH, so the run touches no network and the
# result is reproducible. The table it prints is compared with the contract in
# tests/detection/expected.tsv.
#
# Usage: tests/detection/run.sh [--keep]
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(cd "$HERE/../.." && pwd)"
FIXTURES="$HERE/fixtures"
KEEP=false
[[ "${1:-}" == "--keep" ]] && KEEP=true

WORK="$(mktemp -d "${TMPDIR:-/tmp}/update-flake-detection.XXXXXX")"
cleanup() {
    $KEEP || rm -rf "$WORK"
}
trap cleanup EXIT

# The throwaway global directory: the repo's devbox.json plus a link to the
# repo's devbox.d tree. The script only reads them in this mode.
mkdir -p "$WORK/global"
cp "$REPO/devbox.json" "$WORK/global/devbox.json"
# A copy, not a symlink: the script walks devbox.d with find, which does not
# follow a symlinked directory.
cp -r "$REPO/devbox.d" "$WORK/global/devbox.d"

# The enabled flake list, read from the JSONC devbox.json: a commented-out
# entry is not enabled.
python3 - "$WORK/global/devbox.json" "$WORK/enabled.txt" <<'PY'
import json
import re
import sys

path, out = sys.argv[1], sys.argv[2]
text = open(path).read()
# Drop // comments, but keep the ones inside a string literal (a URL).
pattern = re.compile(r'"(?:[^"\\]|\\.)*"|//[^\n]*')
cleaned = pattern.sub(
    lambda m: "" if m.group(0).startswith("//") else m.group(0), text
)
data = json.loads(cleaned)
names = [
    key.split("devbox.d/", 1)[1]
    for key in data.get("packages", {})
    if key.startswith("path:devbox.d/")
]
with open(out, "w") as handle:
    handle.write("\n".join(names) + "\n")
PY

export UPDATE_FLAKE_FIXTURES="$FIXTURES"
export UPDATE_FLAKE_TEST_ROOT="$WORK/global"
export UPDATE_FLAKE_ENABLED="$WORK/enabled.txt"
export PATH="$HERE/fakebin:$PATH"

bash "$REPO/bin/update-flake" > "$WORK/output.txt" 2>&1 || true

python3 "$HERE/parse_table.py" "$WORK/output.txt" "$WORK/rows.tsv" "$WORK/skipped.txt"

status=0
python3 "$HERE/compare.py" \
    "$HERE/expected.tsv" "$WORK/rows.tsv" \
    "$HERE/expected-skipped.txt" "$WORK/skipped.txt" || status=1

if [[ $status -ne 0 ]]; then
    echo
    echo "--- table the script printed ---"
    sed -e 's/\x1b\[[0-9;]*m//g' "$WORK/output.txt"
    echo "--- end of table ---"
fi

exit $status
