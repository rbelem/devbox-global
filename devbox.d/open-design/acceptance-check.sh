#!/usr/bin/env bash
# Acceptance run for the built package: what the task asked to see, plus the two
# checks a reviewer would otherwise have to take on faith (native addons loading
# from the fixed-up store path, and the tree carrying no dangling symlinks).
#
#   ./acceptance-check.sh            # uses ./result
#   PORT=7461 ./acceptance-check.sh
set -uo pipefail
OD=$(cd "$(dirname "$0")" && pwd)/result
PORT=${PORT:-7459}
SCRATCH=/tmp/opencode/od-verify
rm -rf "$SCRATCH"; mkdir -p "$SCRATCH/state" "$SCRATCH/home"

echo "=== result size ==="
du -sh "$OD" | sed 's/^/  /'
readlink "$OD" | sed 's/^/  result -> /'

echo
echo "=== native addons load from the fixed-up store path ==="
NODE=$(grep -o '/nix/store/[a-z0-9]*-nodejs-2[0-9.]*/bin/node' "$OD/bin/od" | head -1)
echo "  wrapper node: $NODE"
"$NODE" -e '
  const { createRequire } = require("node:module");
  const req = createRequire(process.argv[1] + "/apps/daemon/dist/cli.js");
  const Database = req("better-sqlite3");
  new Database(":memory:").exec("create table t(a); insert into t values (1)");
  const pty = req("node-pty");
  const p = pty.spawn("/bin/sh", ["-c", "echo pty-ok"], { name: "xterm-color", cols: 80, rows: 24, cwd: "/tmp" });
  let out = "";
  p.onData((d) => { out += d; });
  p.onExit(() => {
    console.log("  better-sqlite3: ok    node-pty: ok (" + JSON.stringify(out.trim()) + ")");
    process.exit(0);
  });
  setTimeout(() => { console.log("  node-pty: TIMEOUT " + JSON.stringify(out)); process.exit(1); }, 8000);
' "$OD/lib/open-design"
echo "  exit=$?"

echo
echo "=== dangling symlinks inside the store path (expect none) ==="
find "$OD/" -xtype l -print | head -10
echo "  count: $(find "$OD/" -xtype l | wc -l)"

echo
echo "=== result/bin/od --help ==="
"$OD/bin/od" --help 2>&1 | head -45
echo "  exit=${PIPESTATUS[0]}"

echo
echo "=== daemon start (PORT=$PORT, OD_DATA_DIR=$SCRATCH/state, HOME=$SCRATCH/home) ==="
env -i PATH=/run/current-system/sw/bin:/usr/bin:/bin \
  HOME="$SCRATCH/home" OD_DATA_DIR="$SCRATCH/state" OD_PORT="$PORT" NODE_ENV=production \
  "$OD/bin/od" --no-open > "$SCRATCH/daemon.log" 2>&1 &
DPID=$!
echo "  wrapper pid=$DPID"

UP=no
for i in $(seq 1 90); do
  if curl -fsS -o /dev/null "http://127.0.0.1:$PORT/api/health" 2>/dev/null; then UP=yes; break; fi
  sleep 1
done
echo "  reached /api/health: $UP"

echo
echo "=== curl -sS http://127.0.0.1:$PORT/api/health ==="
curl -sS -w '\nHTTP_STATUS=%{http_code}\n' "http://127.0.0.1:$PORT/api/health"

echo
echo "=== curl -sS http://127.0.0.1:$PORT/ | head -c 400 ==="
curl -sS "http://127.0.0.1:$PORT/" | head -c 400; echo

echo
echo "=== stop ==="
kill -TERM "$DPID" 2>/dev/null
wait "$DPID" 2>/dev/null; RC=$?
sleep 2
if kill -0 "$DPID" 2>/dev/null; then echo "  STILL RUNNING (bad)"; kill -9 "$DPID"; else echo "  stopped cleanly (wait rc=$RC)"; fi
echo "  leftover daemon processes for this build:"
pgrep -af "$OD/lib/open-design" | head -5 || echo "  (none)"

echo
echo "=== state dir the daemon created ==="
ls -la "$SCRATCH/state" | head -8

echo
echo "=== daemon.log (tail 20) ==="
tail -20 "$SCRATCH/daemon.log"
