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
| DeepSWE Leaderboard | https://deepswe.datacurve.ai/ | Pass@1, avg cost, avg time per coding task (v1.1 + v1) |
| SWE-rebench | https://swe-rebench.com/ | Pass@1, Pass@5 per model on SWE-bench tasks |
| OpenCode Go | https://opencode.ai/docs/go/ | Go subscription model list + request limits |
| OpenCode Zen | https://opencode.ai/docs/zen | Zen PAYG pricing per 1M tokens (input/output/cached) |
| models.dev | https://models.dev/ | Canonical model metadata (context window, modalities, tool support) |
| Artificial Analysis | https://artificialanalysis.ai/models | Intelligence Index, cost per task frontier |
| **Arena AI** | **https://arena.ai/leaderboard** | **Agent Arena + Text Arena human-preference scores** |
| LiveBench | https://livebench.ai/ | Contamination-freshened objective benchmark |
| GLM-5.2 Model Card | https://huggingface.co/zai-org/GLM-5.2 | Official Z.ai benchmarks (DeepSWE 46.2, SWE-Pro 62.1, etc.) |
| Z.ai API Docs | https://docs.z.ai/guides/llm/glm-5.2 | Reasoning effort variants (high/max), thinking control |

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

## GLM-5.2 Notes

GLM-5.2 has **two reasoning effort levels**:
- **`max`** (default) — used for all published benchmarks (DeepSWE 46.2, SWE-Pro 62.1, etc.)
- **`high`** — must be explicitly set; faster/cheaper but lower quality

In oh-my-opencode-slim config, map `variant` to `reasoning_effort`:
- `"variant": "max"` → `reasoning_effort: "max"` (benchmark-matched)
- `"variant": "high"` → `reasoning_effort: "high"` (saves tokens, weaker)

Always use `variant: "max"` for Oracle and Council to match the benchmarked scores.

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

# 3. Try both v1 and v1.1 tabs
agent-browser snapshot -i | grep -i "v1\.1\|button.*v1"
agent-browser click @e<N>  # click version button
agent-browser wait 1000
agent-browser snapshot --compact --depth 15

# 4. Fetch GLM-5.2 model card for latest benchmarks
agent-browser open "https://huggingface.co/zai-org/GLM-5.2"
agent-browser snapshot --compact --depth 12

# 5. Fetch Arena AI leaderboard
agent-browser open "https://arena.ai/leaderboard"
agent-browser snapshot --compact --depth 15

# 6. Fetch OpenCode docs
agent-browser open "https://opencode.ai/docs/go/"
agent-browser snapshot --compact --depth 12   # get Go model list + limits

agent-browser open "https://opencode.ai/docs/zen/"
agent-browser snapshot --compact --depth 12   # get Zen pricing table
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
  "oracle": { "model": "opencode-go/<model>", "variant": "max|high", "skills": ["..."], "mcps": [] },
  "librarian": { "model": "opencode-go/<model>", "variant": "low", "skills": ["..."], "mcps": ["..."] },
  "explorer": { "model": "opencode-go/<model>", "variant": "low", "skills": [], "mcps": [] },
  "designer": { "model": "opencode-go/<model>", "variant": "medium", "skills": ["..."], "mcps": [] },
  "fixer": { "model": "opencode-go/<model>", "variant": "high|low", "skills": ["..."], "mcps": [] },
  "observer": { "model": "opencode-go/<model>", "skills": ["docling"] },
  "council": { "model": "opencode-go/<model>", "variant": "max|high" }
}
```

**GLM-5.2 variant note:** To match published benchmark scores, use `"variant": "max"`.
If you need faster/cheaper responses, use `"variant": "high"` but expect less capability.

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
// Current best-value pool strategy (v5):
"pool_strategy": {
  "deepseek-v4-flash (158K/mo)":    "Orchestrator",
  "mimo-v2.5 (150K/mo)":            "Explorer + Librarian",
  "kimi-k2.7-code (9.25K/mo)":      "Fixer",
  "glm-5.2 (4.3K/mo)":              "Oracle + Council",
  "kimi-k2.6 (5.75K/mo)":           "Designer",
  "minimax-m3 (16K/mo)":            "Observer"
}
```

All pools are separate — no contention. GLM-5.2's 4,300/mo is enough for Oracle + Council since both are low-volume.

See REFERENCE.md for request limits per model.

## Cost to Run a Benchmark

Running DeepSWE (113 tasks × mini-swe-agent) on missing models via Zen PAYG:

| Model | Est 113 tasks | Est 20 tasks (recommended) |
|---|---|---|
| GLM-5.2 | ~$52 | ~$9 |
| qwen3.7-max | ~$89 | ~$16 |
| kimi-k2.7-code | ~$35 | ~$6 |
| deepseek-v4-flash | ~$35 | ~$6 |

Highest ROI targets: **kimi-k2.7-code** (31% v1.1, cheap), **deepseek-v4-flash** (cheapest reliable).
Use `pier run -p deep-swe/tasks --n-tasks 20 --sample-seed 0` for subset.

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

- **DeepSWE** uses JS-rendered tables with interactive filters and version tabs (v1.1 vs v1). `agent-browser` is required for accurate scraping.
- **OpenCode docs** (Go, Zen) are server-rendered Markdown/HTML. Both `curl` and `agent-browser` work.
- **GLM-5.2 benchmarks** from vendor model card (huggingface.co/zai-org/GLM-5.2) are self-reported but widely verified by independent sources (Artificial Analysis, VentureBeat, TechStackups).
- **Arena AI** is the renamed LMSYS Chatbot Arena — human preference votes with causal tracing.
- **Data volatility**: Pricing and leaderboard data changes frequently. Always re-fetch before making config decisions. The REFERENCE.md tables are snapshots, not live.

## See Also

- [REFERENCE.md](REFERENCE.md) — detailed benchmark methodology and model scoring tables
- [scripts/fetch-pricing.sh](scripts/fetch-pricing.sh) — agent-browser-powered data fetcher
