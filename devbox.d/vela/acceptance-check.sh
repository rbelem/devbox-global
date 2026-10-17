#!/usr/bin/env bash
# Acceptance run for the built vela package, driven through open-design:
# the daemon's amr probe must resolve vela from PATH, so the status route
# stops answering 503 amr-runtime-unavailable and /api/agents reports
# amr as available.
#
#   nix build "path:devbox.d/vela#default" --out-link devbox.d/vela/result
#   ./acceptance-check.sh          # PORT=7463 to move the scratch daemon
set -uo pipefail
HERE=$(cd "$(dirname "$0")" && pwd)
VELA=$HERE/result
OD=$(cd "$HERE/../open-design" && pwd)/result
PORT=${PORT:-7462}
SCRATCH=/tmp/opencode/vela-verify
mkdir -p "$SCRATCH/home" "$SCRATCH/state"

fail=0
ok() { echo "  ok: $*"; }
bad() { echo "  FAIL: $*"; fail=1; }

echo "=== result ==="
du -shL "$VELA"
readlink "$VELA" | sed 's/^/  result -> /'

echo
echo "=== vela --version / --help / inner opencode ==="
v=$("$VELA/bin/vela" --version)
[ "$v" = "0.1.6" ] && ok "vela --version = $v" || bad "vela --version = $v"
"$VELA/bin/vela" --help > /dev/null && ok "vela --help exit 0" || bad "vela --help nonzero"
"$VELA/bin/libexec/opencode/opencode" --version > /dev/null && ok "inner opencode runs" || bad "inner opencode failed"

echo
echo "=== scratch daemon (port $PORT, OD_DATA_DIR=$SCRATCH/state, vela on PATH) ==="
PATH="$VELA/bin:$PATH" HOME="$SCRATCH/home" OD_DATA_DIR="$SCRATCH/state" OD_PORT="$PORT" \
  "$OD/bin/open-design" --no-open > "$SCRATCH/daemon.log" 2>&1 &
DPID=$!
trap 'kill -TERM "$DPID" 2>/dev/null' EXIT
echo "  daemon pid=$DPID"

UP=no
for i in $(seq 1 90); do
  if curl -fsS -o /dev/null "http://127.0.0.1:$PORT/api/health" 2>/dev/null; then UP=yes; break; fi
  sleep 1
done
if [ "$UP" = yes ]; then ok "/api/health up after ${i}s"; else
  bad "/api/health never came up"
  tail -30 "$SCRATCH/daemon.log"
  exit 1
fi

echo
echo "=== /api/integrations/vela/status ==="
CODE=$(curl -sS -o "$SCRATCH/vela-status.json" -w '%{http_code}' "http://127.0.0.1:$PORT/api/integrations/vela/status")
echo "  HTTP=$CODE"
cat "$SCRATCH/vela-status.json" | sed 's/^/  /'; echo
[ "$CODE" = "200" ] && ok "status route serves (503 gone)" || bad "HTTP=$CODE"
if grep -q 'amr-runtime-unavailable' "$SCRATCH/vela-status.json"; then
  bad "still amr-runtime-unavailable"
else
  ok "no amr-runtime-unavailable"
fi

echo
echo "=== /api/agents amr entry ==="
curl -sS -o "$SCRATCH/agents.json" "http://127.0.0.1:$PORT/api/agents"
jq -c '.agents[] | select(.id == "amr")' "$SCRATCH/agents.json" | sed 's/^/  /'
AVAIL=$(jq -r '.agents[] | select(.id == "amr") | .available' "$SCRATCH/agents.json")
[ "$AVAIL" = "true" ] && ok "amr available=true" || bad "amr available=$AVAIL"

echo
echo "=== stop ==="
kill -TERM "$DPID" 2>/dev/null
wait "$DPID" 2>/dev/null
sleep 2
if kill -0 "$DPID" 2>/dev/null; then bad "daemon still running"; kill -9 "$DPID"; else ok "scratch daemon stopped"; fi

echo
if [ "$fail" = 0 ]; then echo "ALL CHECKS PASSED"; else echo "CHECKS FAILED"; exit 1; fi
