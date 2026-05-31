---
name: benchmark-model-preset
description: Research AI model benchmarks (DeepSWE, SWE-rebench), pricing (OpenCode Go/Zen, models.dev), and capability metrics to build optimal-value oh-my-opencode-slim presets. Use when user wants to optimize preset, compare model pricing, benchmark models, build best-value agent config, or tune oh-my-opencode-slim.json.
---

# Benchmark Model Preset

Build optimal-value oh-my-opencode-slim presets by cross-referencing benchmark scores, pricing, and agent role requirements.

## Quick Start

```
/preset-bench          # fetch latest data + compare current preset vs alternatives
/preset-bench --all     # evaluate all possible model combinations per agent role
/preset-bench --dry-run # show recommendations without modifying config
```

## Data Sources

| Source | URL | What It Provides |
|---|---|---|
| DeepSWE Leaderboard | https://deepswe.datacurve.ai/ | Pass@1, avg cost, avg time per coding task |
| SWE-rebench | https://swe-rebench.com/ | Pass@1, Pass@5 per model on SWE-bench tasks |
| OpenCode Go | https://opencode.ai/docs/go/ | Go subscription model list + request limits |
| OpenCode Zen | https://opencode.ai/docs/zen | Zen PAYG pricing per 1M tokens (input/output/cached) |
| models.dev | https://models.dev/ | Canonical model metadata (context window, modalities, tool support) |
| Artificial Analysis | https://artificialanalysis.ai/models | Intelligence vs price/speed comparisons |
| CloudPrice | https://cloudprice.net/models | Cross-provider pricing tables |

## Agent Role → Model Requirements

Map benchmark strengths to what each agent needs:

| Agent | Key Requirement | Best Benchmark Signal |
|---|---|---|
| **Orchestrator** | Strong general coding + delegation judgment | DeepSWE Pass@1 (general coding ability) |
| **Oracle** | Deep reasoning, correctness, architecture | DeepSWE Pass@1 + Artificial Analysis intelligence score |
| **Council** | Consensus across diverse perspectives | Mix models from different providers/families |
| **Librarian** | Fast lookup, instruction following | Speed (latency/throughput), cheap |
| **Explorer** | Fast codebase search, pattern matching | Speed, cheap — benchmark scores less relevant |
| **Designer** | UI/UX quality, visual output | Not well measured by coding benchmarks — use model reputation for frontend |
| **Fixer** | Reliable bounded implementation | DeepSWE Pass@1 + consistency (low variance across runs) |
| **Observer** | Vision, PDF/document reading | Vision capability, multimodal quality |

## Workflow

### Step 1: Gather Current State

```bash
# Read current preset
cat ~/.config/opencode/oh-my-opencode-slim.json

# Read any backup/benchmark history
cat ~/.config/opencode/oh-my-opencode-slim-bak.json
```

### Step 2: Fetch Latest Pricing + Benchmarks (via agent-browser)

**Prerequisite:** `npm i -g agent-browser && agent-browser install`

Use agent-browser to scrape JS-rendered pages and interactive tables:

```bash
# Automated: fetch all sources at once
./scripts/fetch-pricing.sh

# Or fetch specific sources:
./scripts/fetch-pricing.sh --deepswe    # DeepSWE leaderboard
./scripts/fetch-pricing.sh --go         # Go doc pricing + limits
./scripts/fetch-pricing.sh --zen        # Zen doc pricing
./scripts/fetch-pricing.sh --swe        # SWE-rebench leaderboard
```

**Manual agent-browser workflow** (for interactive scraping):

```bash
# 1. Open DeepSWE leaderboard
agent-browser open "https://deepswe.datacurve.ai/"
agent-browser wait 3000

# 2. Snapshot the page to see elements (find table data)
agent-browser snapshot --compact --depth 15

# 3. If filter dropdown exists, click to expand
agent-browser snapshot -i                     # find interactive element ref
agent-browser click @e<N>                     # click the "Models(15/18)" toggle
agent-browser wait 1000
agent-browser snapshot --compact --depth 15   # get expanded view

# 4. Fetch OpenCode docs
agent-browser open "https://opencode.ai/docs/go/"
agent-browser snapshot --compact --depth 12   # get Go model list + limits

agent-browser open "https://opencode.ai/docs/zen/"
agent-browser snapshot --compact --depth 12   # get Zen pricing table

# 5. Fetch models.dev registry
agent-browser open "https://models.dev/api.json"
agent-browser snapshot --compact --depth 10

# 6. Save screenshots for visual review
agent-browser screenshot --full --annotate    # annotated screenshot
```

### Step 3: Cross-Reference Per Agent

For each agent in the preset:

1. **List candidate models** available on your providers (opencode-go, opencode-zen, openrouter, etc.)
2. **Filter by capability**: vision for Observer, speed for Explorer, reasoning for Oracle
3. **Check benchmark scores**: DeepSWE Pass@1 for general coding, cost per task
4. **Check pricing**: Go request limits vs Zen PAYG — choose the cheaper endpoint for equivalent models
5. **Check context window**: Ensure ≥128K for agents that handle large files (Orchestrator, Fixer)

### Step 4: Build the Preset

Write or update the preset in `oh-my-opencode-slim.json`. Follow the schema:

```jsonc
"my-best-value": {
  "orchestrator": { "model": "opencode-go/<model>", "skills": ["*"], "mcps": ["*"] },
  "oracle": { "model": "opencode-go/<model>", "variant": "high|max", "skills": ["..."], "mcps": [] },
  "librarian": { "model": "opencode-go/<model>", "variant": "low", "skills": ["..."], "mcps": ["..."] },
  "explorer": { "model": "opencode-go/<model>", "variant": "low", "skills": [], "mcps": [] },
  "designer": { "model": "opencode-go/<model>", "variant": "medium", "skills": ["..."], "mcps": [] },
  "fixer": { "model": "opencode-go/<model>", "variant": "high|low", "skills": ["..."], "mcps": [] },
  "observer": { "model": "opencode-go/<model>", "skills": ["docling"] },
  "council": { "model": "opencode-go/<model>", "variant": "max|high" }
}
```

### Step 5: Validate

```bash
# Check the config parses
opencode models --refresh

# Test each agent responds
# Inside opencode: ping all agents

# Switch to the new preset manually or via /preset
```

## Go Pool Allocation Strategy

Go subscription has shared per-model request pools. Multiple agents using the same model compete for the same pool. Optimize by spreading agents across models:

```jsonc
// Example: orchestator gets the deepest pool, low-volume agents share tighter ones
"pool_strategy": {
  "deepseek-v4-flash (158K/mo)":  "Orchestrator only",    // 19% of pool
  "qwen3.6-plus (16.3K/mo)":       "Fixer + Oracle",      // ~22% of pool
  "minimax-m2.7 (17K/mo)":         "Explorer + Librarian", // ~53% of pool
  "kimi-k2.6 (5.75K/mo)":          "Designer + Observer",  // ~42% of pool
  "mimo-v2.5-pro (6.45K/mo)":      "Council only"          // ~5% of pool
}
```

See REFERENCE.md for request limits per model.

## Cost to Run a Benchmark

Running DeepSWE (113 tasks × mini-swe-agent) on missing models via Zen PAYG:

| Model | Est 113 tasks | Est 20 tasks (recommended) |
|---|---|---|
| qwen3.6-plus | ~$46 | ~$8 |
| glm-5 | ~$52 | ~$9 |
| kimi-k2.5 | ~$39 | ~$7 |
| deepseek-v4-flash | ~$35 | ~$6 |
| qwen3.5-plus | ~$17 | ~$3 |
| minimax-m2.7 | ~$16 | ~$3 |
| minimax-m2.5 | ~$16 | ~$3 |
| mimo-v2.5 | ~$38 | ~$7 |

Highest ROI targets: **glm-5** ($~9 for 20 tasks — 3x faster than DS-V4-Flash, 99.5% acc in user bench), **qwen3.6-plus** ($~8 — 100% acc in user bench). Use `pier run -p deep-swe/tasks --n-tasks 20 --sample-seed 0` for subset.

## Pricing Strategy Rules

1. **Go subscription** is better for high-volume agents (Explorer, Librarian, Fixer) — $10/mo flat with generous limits
2. **Zen PAYG** is better for occasional-use agents (Council, Oracle) — pay per token, no monthly commitment
3. **Free models** (DeepSeek V4 Flash Free, MiMo-V2.5 Free, Nemotron 3 Super Free) are viable for experimental/toy presets only — unreliable quality
4. **Same model on both Go + Zen** → use Go (already paid for), unless you need higher rate limits

## Cost Comparison Heuristics

For a given model, estimate monthly cost:

- **Go (already subscribed)**: $0 additional per request (within limits)
- **Go (need upgrade)**: $10/mo base + top-up if exceeding $60/mo
- **Zen**: (avg input_tokens × input_price + avg output_tokens × output_price) × requests_per_month

See the utility script `scripts/fetch-pricing.sh` for automated cost estimation.

## Data Quality Notes

- **DeepSWE** uses JS-rendered tables with interactive filters. `agent-browser` is required for accurate scraping — `curl` alone cannot extract the data.
- **OpenCode docs** (Go, Zen) are server-rendered Markdown/HTML. Both `curl` and `agent-browser` work, but `agent-browser` handles rate-limiting and mobile-redirect cases better.
- **models.dev** exposes a static JSON API at `/api.json`. Either tool works.
- **Screenshots**: Use `agent-browser screenshot --annotate` to capture visual page state for tables with complex formatting or charts.
- **Data volatility**: Pricing and leaderboard data changes frequently. Always re-fetch before making config decisions. The REFERENCE.md tables are snapshots, not live.

## See Also

- [REFERENCE.md](REFERENCE.md) — detailed benchmark methodology and model scoring tables
- [scripts/fetch-pricing.sh](scripts/fetch-pricing.sh) — agent-browser-powered data fetcher
