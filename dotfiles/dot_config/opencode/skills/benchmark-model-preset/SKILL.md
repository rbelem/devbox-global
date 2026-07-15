---
name: benchmark-model-preset
description: Research model benchmarks (DeepSWE, Artificial Analysis, Design Arena) and provider pricing (OpenCode Go/Zen, OpenRouter, z.ai, MiniMax, OmniRoute) to build optimal-value oh-my-opencode-slim presets. Use when user wants to optimize presets, compare models, audit agent routing, or evaluate subscription-vs-PAYG cost.
---

# Benchmark Model Preset

Build optimal-value oh-my-opencode-slim presets by cross-referencing **verified** benchmark scores, provider pricing, and agent role requirements.

## Agent Role → Model Requirements

| Agent | Key Requirement | Best Signal |
|---|---|---|
| **Orchestrator** | Strong general coding + delegation judgment | DeepSWE Pass@1 + Arena Agent "Net Improvement" |
| **Oracle** | Deep reasoning, correctness, architecture | DeepSWE + AA intelligence index — always `variant: max` |
| **Council** | Consensus across diverse providers/families | Mix models from different namespaces, not just tier swaps |
| **Librarian** | Fast lookup, instruction following | Speed (latency/throughput), cheap |
| **Explorer** | Fast codebase search, pattern matching | Speed, cheap — benchmark scores less relevant |
| **Designer** | UI/UX quality, visual output | Design Arena ELO (UI component/website categories) |
| **Fixer** | Reliable bounded implementation | DeepSWE + consistency (low variance) — prefer **verified** Go models over self-reported scores |
| **Observer** | Vision, PDF/document reading | Vision capability, multimodal quality |

## Hy3 — Verified-Score Caveat

Tencent Hy3 (Apache 2.0, 295B MoE/21B active). **Self-reported** scores: SWE-bench Verified 78%, DeepSWE 28. AA Intelligence Index 34 (#23/94 — below all Go models). $0.14/$0.58 on OpenRouter ONLY (not on Go/Zen). Text-only. Reasoning modes: `no_think` (default), `low`, `high`. Structured output errors 7–11%, tool call errors 3–4%.

**Council yes, fixer no** — kimi-k2.7-code (DeepSWE 31%, **verified**, free on Go) beats Hy3 on every independent metric. Reach for Hy3 only when you need Tencent-provider diversity in council.

## GLM-5.2 Variant Notes

Two reasoning levels: **`max`** (benchmark-matched) and **`high`** (faster/cheaper). Map `"variant": "max"|"high"` in preset config. **Always `max` for Oracle and Council.**

## Provider Gotchas (2026)

| Provider | Gotcha | Effect on preset design |
|---|---|---|
| **z.ai GLM-5.2** | 2–3× quota multiplier per prompt (peak/off-peak); 1× off-peak promo through Sept 2026 | Each z.ai Coding Pro prompt on GLM-5.2 costs 2–3× quota. Use `glm-4.7` (1×) for routine fixer, reserve GLM-5.2 for reasoning-heavy roles. |
| **z.ai Coding Pro** | 5-hr (~400 prompts Pro) + weekly (~2,000) caps; no PAYG fallback within plan | Hit cap = calls fail until window resets. No queue, no downgrade. |
| **MiniMax Max** | 5-hr + weekly windows, but **passive timer drain bug** (GitHub #47) | Quota can exhaust without active API calls. Heavy fixer work can burn the 5-hr window in 50min–5hr. Use `opencode-go/*` for non-critical work to avoid drain. |
| **MiniMax Max** | All modalities (text/video/speech/music/image) share one quota pool | Video/speech usage eats LLM budget. |
| **OpenCode Go** | Free within limits, includes mimo/kimi/qwen/glm — not all models on every tier | `kimi-k2.7-code` is **verified** for code; `qwen3.7-max` is intermittently unavailable. |
| **OpenCode Zen** | PAYG — Claude, GPT-5.x, DeepSeek | Use as overflow, not default. |
| **OpenRouter** | PAYG — many models, but credits can exhaust | Check `testStatus` in OmniRoute before recommending. |
| **OmniRoute** | Unified gateway; provider `x-omniroute-provider` header in responses reveals actual routing | First `/`-segment in model ID is the **namespace** (e.g., `opencode-go/`, `zai/`, `minimax/`). Use this to verify the model actually hits the intended provider. |

## Workflow

### Step 1: Gather Current State
```bash
cat ~/.config/opencode/oh-my-opencode-slim.json
cat ~/.config/opencode/opencode.json
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

**Provider-specific scraping (librarian + firecrawl):** for subscription plan limits (5-hr caps, weekly caps, multipliers), dispatch a librarian to scrape the provider's docs and pricing pages. Provider docs often hide the real limits behind JavaScript.

### Step 3: Test Endpoint Health
Before recommending models, verify they are actually serving inference:

```bash
# Quick ping (checks endpoint exists)
./scripts/test-endpoints.sh --ping-only

# Full live inference test (needs API key)
./scripts/test-endpoints.sh $OPENCODE_GO_API_KEY
```

**Auth differences:**
- OpenAI-compatible models (`/chat/completions`): `Authorization: Bearer <key>`
- Anthropic-compatible models (`/messages`): `x-api-key: <key>`

**Expected results:** 13/14 models up. `qwen3.7-max` observed "temporarily unavailable" intermittently.

**Via OmniRoute:** inspect `x-omniroute-provider` and `x-omniroute-response-cost` headers to confirm routing + cost.

### Step 4: Cross-Reference Per Agent
1. **List candidates** on each provider namespace (opencode-go, opencode-zen, openrouter, zai, minimax)
2. **Filter by capability**: vision, speed, reasoning
3. **Check benchmarks**: DeepSWE for coding, AA indices for reasoning
4. **Compare pricing**: Go (free within limits) vs Zen PAYG vs OpenRouter PAYG vs subscription flat-fee — see REFERENCE.md for rules
5. **Check context window**: ≥128K for Orchestrator, Fixer
6. **Check provider health** via OmniRoute dashboard before recommending

### Step 5: Build the Preset
```jsonc
"my-best-value": {
  "orchestrator": { "model": "opencode-go/<model>", "skills": ["*"], "mcps": ["*"] },
  "oracle": { "model": "opencode-go/<model>", "variant": "max", "skills": ["..."], "mcps": [] },
  "librarian": { "model": "opencode-go/<model>", "variant": "low", "skills": ["..."], "mcps": ["..."] },
  "explorer": { "model": "opencode-go/<model>", "variant": "low", "skills": [], "mcps": [] },
  "designer": { "model": "opencode-go/<model>", "variant": "medium", "skills": ["..."], "mcps": [] },
  "fixer": { "model": "opencode-go/<model>", "variant": "high|low", "skills": ["..."], "mcps": [] },
  "observer": { "model": "opencode-go/<model>", "skills": ["docling"] },
  "council": { "model": "opencode-go/<model>", "variant": "max" }
}
```

### Step 6: Validate
Switch the active preset and run a real coding task end-to-end. Confirm:
- All agents respond (no 404 from OmniRoute)
- `x-omniroute-provider` header matches the intended provider
- No cap errors in 30+ minutes of active use
- Cost per task matches the projected budget

## See Also

- [REFERENCE.md](REFERENCE.md) — data sources, pricing tables, pool strategy, cost heuristics, data quality notes, manual scraping guide
- [scripts/fetch-pricing.sh](scripts/fetch-pricing.sh) — automated data fetcher (agent-browser + OpenRouter API)
- [scripts/test-endpoints.sh](scripts/test-endpoints.sh) — live endpoint health checker for all OpenCode Go models
- **OpenRouter MCP:** `openrouter_models-list`, `openrouter_benchmarks`, `openrouter_rankings-daily`, `openrouter_model-endpoints`
- **OmniRoute MCP:** `omniroute_list_models_catalog`, `omnirroute_simulate_route`, `omnirroute_explain_route`, `omnirroute_check_quota`, `omnirroute_cost_report` — for subscription plan limits and routing verification
