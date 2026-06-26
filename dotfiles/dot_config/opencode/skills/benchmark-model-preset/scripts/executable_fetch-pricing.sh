#!/usr/bin/env bash
# Fetch latest OpenCode pricing + benchmarks via agent-browser and OpenRouter API.
# Requires: agent-browser (npm i -g agent-browser && agent-browser install)
#   OR: OPENROUTER_API_KEY env var for --openrouter mode
# Usage: ./fetch-pricing.sh [--go | --zen | --deepswe | --models | --swe | --analysis | --arena | --openrouter | --all]
# Output: agent-browser snapshots saved to ./out/, OpenRouter data to ./out/or-*.json

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

fetch_openrouter() {
  echo "=== OpenRouter: fetching model catalog ==="
  if [ -z "${OPENROUTER_API_KEY:-}" ]; then
    echo "OPENROUTER_API_KEY not set. Skipping OpenRouter fetch."
    echo "To enable: export OPENROUTER_API_KEY=sk-or-v1-..."
    echo "Get a key at https://openrouter.ai/keys"
    return
  fi

  # Fetch model catalog with pricing, context, and benchmark data
  echo "Fetching model catalog..."
  curl -sL -H "Authorization: Bearer $OPENROUTER_API_KEY" \
    "https://openrouter.ai/api/v1/models" \
    -o "$OUTDIR/or-models.json"
  echo "Done: or-models.json (raw model catalog)"

  # Extract a human-readable pricing summary
  echo "Generating pricing summary..."
  cat "$OUTDIR/or-models.json" | python3 -c "
import json, sys
data = json.load(sys.stdin)
models = data.get('data', [])
# Sort by prompt price ascending
models.sort(key=lambda m: float(m.get('pricing', {}).get('prompt', 999)))
print(f'| {\"Model\":<30} | {\"Prompt\":<12} | {\"Completion\":<12} | {\"Context\":<10} | {\"AA Intel\":<9} | {\"AA Coding\":<10} |')
print(f'|{\"-\"*32}|{\"-\"*14}|{\"-\"*14}|{\"-\"*12}|{\"-\"*11}|{\"-\"*12}|')
for m in models[:60]:
    name = m.get('name', '?')[:30]
    p = m.get('pricing', {})
    prompt = f\"\${float(p.get('prompt',0))*1e6:.4f}\"
    compl = f\"\${float(p.get('completion',0))*1e6:.4f}\"
    ctx = m.get('context_length', 0)
    ctx_str = f\"{ctx//1000}K\" if ctx >= 1000 else str(ctx)
    aa = m.get('benchmarks', {}).get('artificial_analysis', {}) or {}
    intel = aa.get('intelligence_index', '')
    coding = aa.get('coding_index', '')
    intel_str = f'{intel:.1f}' if isinstance(intel, (int, float)) else ''
    coding_str = f'{coding:.1f}' if isinstance(coding, (int, float)) else ''
    print(f'| {name:<30} | {prompt:<12} | {compl:<12} | {ctx_str:<10} | {intel_str:<9} | {coding_str:<10} |')
" > "$OUTDIR/or-pricing-summary.txt"
  echo "Done: or-pricing-summary.txt (top 60 models sorted by prompt price)"

  # Fetch daily rankings
  echo "Fetching daily rankings..."
  curl -sL -H "Authorization: Bearer $OPENROUTER_API_KEY" \
    "https://openrouter.ai/api/v1/rankings/daily" \
    -o "$OUTDIR/or-rankings.json"
  echo "Done: or-rankings.json"

  echo "OpenRouter data fetched. Use openrouter_* MCP tools for live queries."
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
  --openrouter) fetch_openrouter ;;
  --all|*)
    fetch_go
    fetch_zen
    fetch_deepswe
    fetch_models_dev
    fetch_swe_rebench
    fetch_artificial_analysis
    fetch_arena
    fetch_openrouter
    echo ""
    echo "=== All fetches complete ==="
    echo "Output in: $OUTDIR/"
    ls -la "$OUTDIR/"
    ;;
esac
