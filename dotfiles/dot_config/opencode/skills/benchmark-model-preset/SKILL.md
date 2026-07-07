---
name: benchmark-model-preset
description: Research AI model benchmarks (DeepSWE, SWE-rebench), pricing (OpenCode Go/Zen, OpenRouter, models.dev), and capability metrics to build optimal-value oh-my-opencode-slim presets. Use when user wants to optimize preset, compare model pricing, benchmark models, build best-value agent config, or tune oh-my-opencode-slim.json.
---

# Benchmark Model Preset

Build optimal-value oh-my-opencode-slim presets by cross-referencing benchmark scores, pricing, and agent role requirements.

## Quick Start

```
/preset-bench          # fetch latest data + compare current preset vs alternatives
/preset-bench --all     # evaluate all possible model combinations per agent role
/preset-bench --dry-run # show recommendations without modifying config
```

## Agent Role → Model Requirements

| Agent | Key Requirement | Best Benchmark Signal |
|---|---|---|
| **Orchestrator** | Strong general coding + delegation judgment | DeepSWE Pass@1 + Arena Agent "Net Improvement" |
| **Oracle** | Deep reasoning, correctness, architecture | DeepSWE Pass@1 + Artificial Analysis intelligence score |
| **Council** | Consensus across diverse perspectives | Mix models from different providers/families |
| **Librarian** | Fast lookup, instruction following | Speed (latency/throughput), cheap |
| **Explorer** | Fast codebase search, pattern matching | Speed, cheap — benchmark scores less relevant |
| **Designer** | UI/UX quality, visual output | Design Arena ELO (UI component/website categories) |
| **Fixer** | Reliable bounded implementation | DeepSWE Pass@1 + consistency (low variance) |
| **Observer** | Vision, PDF/document reading | Vision capability, multimodal quality |

## GLM-5.2 Variant Notes

Two reasoning levels: **`max`** (default, benchmark-matched) and **`high`** (faster/cheaper). Map `"variant": "max"|"high"` in preset config. Always use `max` for Oracle and Council.

## Workflow

### Step 1: Gather Current State
```bash
cat ~/.config/opencode/oh-my-opencode-slim.json
cat ~/.config/opencode/oh-my-opencode-slim-bak.json
```

### Step 2: Fetch Latest Pricing + Benchmarks

**Automated (agent-browser):** `./scripts/fetch-pricing.sh [--deepswe | --go | --zen | --swe | --arena | --openrouter | --all]`
Prerequisite: `npm i -g agent-browser && agent-browser install`. See REFERENCE.md for manual scraping steps.

**Live via OpenRouter MCP** (no browser):
- `openrouter_models-list` — catalog with pricing, context, AA benchmarks
- `openrouter_model-endpoints author="z-ai" slug="glm-5.2"` — per-provider pricing/latency
- `openrouter_benchmarks source="artificial-analysis"` — AA indices
- `openrouter_benchmarks source="design-arena"` — UI/UX ELO scores
- `openrouter_rankings-daily` — model popularity

### Step 3: Test Endpoint Health
Before recommending models, verify they are actually serving inference:

```bash
# Quick ping without API key (checks endpoint exists, returns 401)
./scripts/test-endpoints.sh --ping-only

# Full live inference test (needs API key)
./scripts/test-endpoints.sh $OPENCODE_GO_API_KEY
# or
export OPENAI_API_KEY=sk-...
./scripts/test-endpoints.sh
```

**Auth differences discovered:**
- OpenAI-compatible models (`/chat/completions`): `Authorization: Bearer <key>`
- Anthropic-compatible models (`/messages`): **`x-api-key: <key>`**

**Expected results:** 13/14 models up. `qwen3.7-max` has been observed as "temporarily unavailable" intermittently.

### Step 4: Cross-Reference Per Agent
1. **List candidates** on opencode-go, opencode-zen, openrouter
2. **Filter by capability**: vision, speed, reasoning
3. **Check benchmarks**: DeepSWE for coding, AA indices for reasoning
4. **Compare pricing**: Go (free within limits) vs Zen PAYG vs OpenRouter PAYG — see REFERENCE.md for rules
5. **Check context window**: ≥128K for Orchestrator, Fixer

### Step 5: Build the Preset
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

### Step 6: Validate
```bash
opencode models --refresh
# Test agents, switch to new preset
```

## See Also

- [REFERENCE.md](REFERENCE.md) — data sources, pricing tables, pool strategy, cost heuristics, data quality notes, manual scraping guide
- [scripts/fetch-pricing.sh](scripts/fetch-pricing.sh) — automated data fetcher (agent-browser + OpenRouter API)
- [scripts/test-endpoints.sh](scripts/test-endpoints.sh) — live endpoint health checker for all OpenCode Go models
- **OpenRouter MCP:** `openrouter_models-list`, `openrouter_benchmarks`, `openrouter_rankings-daily`, `openrouter_model-endpoints` — live queries during sessions
