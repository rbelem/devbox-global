#!/usr/bin/env bash
# Fetch latest OpenCode pricing + benchmarks via agent-browser.
# Requires: agent-browser (npm i -g agent-browser && agent-browser install)
# Usage: ./fetch-pricing.sh [--go | --zen | --deepswe | --models | --swe | --analysis | --arena | --all]
# Output: agent-browser snapshots saved to ./out/

set -euo pipefail
OUTDIR="$(dirname "$0")/out"
mkdir -p "$OUTDIR"

ab() {
  agent-browser "$@" 2>/dev/null
}

ensure_chrome() {
  if ! agent-browser open --help >/dev/null 2>&1; then
    echo "agent-browser not found. Install: npm i -g agent-browser && agent-browser install"
    exit 1
  fi
}

fetch_go() {
  echo "=== Go: fetching model list ==="
  ab open "https://opencode.ai/zen/go/v1/models" 2>/dev/null
  ab snapshot --compact --depth 10 > "$OUTDIR/go-models.txt"
  echo "Done: go-models.txt"

  echo "=== Go: fetching docs page with request limits ==="
  ab open "https://opencode.ai/docs/go/" 2>/dev/null
  ab snapshot --compact --depth 12 > "$OUTDIR/go-docs.txt"
  echo "Done: go-docs.txt"
}

fetch_zen() {
  echo "=== Zen: fetching pricing page ==="
  ab open "https://opencode.ai/docs/zen/" 2>/dev/null
  ab snapshot --compact --depth 12 > "$OUTDIR/zen-pricing.txt"
  echo "Done: zen-pricing.txt"
}

fetch_deepswe() {
  echo "=== DeepSWE: fetching leaderboard ==="
  ab open "https://deepswe.datacurve.ai/" 2>/dev/null
  ab wait 3000
  ab snapshot --compact --depth 15 > "$OUTDIR/deepswe-snapshot.txt"
  echo "Done: deepswe-snapshot.txt"

  # Try clicking the model count dropdown to show all 18 models
  echo "=== DeepSWE: trying to expand model filter ==="
  ab snapshot -i 2>/dev/null | grep -q "Models(" && {
    ab click "$(ab snapshot -i | grep -o '@e[0-9]*.*Models(' | head -1 | grep -o '@e[0-9]*' | head -1)" 2>/dev/null || true
    ab wait 1000
    ab snapshot --compact --depth 15 > "$OUTDIR/deepswe-expanded.txt"
    echo "Done: deepswe-expanded.txt"
  } || echo "Model filter button not found, using single snapshot"
}

fetch_models_dev() {
  echo "=== models.dev: fetching API ==="
  ab open "https://models.dev/api.json" 2>/dev/null
  ab snapshot --compact --depth 10 > "$OUTDIR/models-dev.txt"
  echo "Done: models-dev.txt"
}

fetch_swe_rebench() {
  echo "=== SWE-rebench: fetching leaderboard ==="
  ab open "https://swe-rebench.com/" 2>/dev/null
  ab wait 3000
  ab snapshot --compact --depth 15 > "$OUTDIR/swe-rebench.txt"
  echo "Done: swe-rebench.txt"
}

fetch_artificial_analysis() {
  echo "=== Artificial Analysis: fetching model comparison ==="
  ab open "https://artificialanalysis.ai/models" 2>/dev/null
  ab wait 3000
  ab snapshot --compact --depth 12 > "$OUTDIR/artificial-analysis.txt"
  echo "Done: artificial-analysis.txt"
}

fetch_arena() {
  echo "=== LM Arena Agent: fetching agent leaderboard ==="
  ab open "https://arena.ai/leaderboard/agent/" 2>/dev/null
  ab wait --load networkidle 2>/dev/null
  ab snapshot --compact --depth 20 > "$OUTDIR/arena-agent-snapshot.txt"
  echo "Done: arena-agent-snapshot.txt (main table)"

  # Also fetch methodology page
  echo "=== LM Arena Agent: fetching methodology ==="
  # Try clicking the "View Methodology" link
  ab snapshot -i 2>/dev/null | grep -q "View Methodology" && {
    ab click "$(ab snapshot -i | grep -o '@e[0-9]*.*View Methodology' | head -1 | grep -o '@e[0-9]*')" 2>/dev/null || true
    ab wait --load networkidle 2>/dev/null
    ab snapshot --compact --depth 15 > "$OUTDIR/arena-agent-methodology.txt"
    echo "Done: arena-agent-methodology.txt"
  } || echo "View Methodology link not found"
}

fetch_arena_no_browser() {
  # For curl-based fetching (static page alternative)
  echo "=== LM Arena Agent: fetching via curl (fallback) ==="
  curl -sL "https://arena.ai/leaderboard/agent/" -o "$OUTDIR/arena-agent-raw.html"
  echo "Done: arena-agent-raw.html (not recommended — JS-rendered table may be incomplete)"
}

ensure_chrome

case "${1:---all}" in
  --go)        fetch_go ;;
  --zen)       fetch_zen ;;
  --deepswe)   fetch_deepswe ;;
  --models)    fetch_models_dev ;;
  --swe)       fetch_swe_rebench ;;
  --analysis)  fetch_artificial_analysis ;;
  --arena)     fetch_arena ;;
  --all|*)
    fetch_go
    fetch_zen
    fetch_deepswe
    fetch_models_dev
    fetch_swe_rebench
    fetch_artificial_analysis
    fetch_arena
    echo ""
    echo "=== All fetches complete ==="
    echo "Output in: $OUTDIR/"
    ls -la "$OUTDIR/"
    ;;
esac
