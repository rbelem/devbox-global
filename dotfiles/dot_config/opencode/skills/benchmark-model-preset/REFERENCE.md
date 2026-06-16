# Benchmark & Pricing Reference

## DeepSWE Leaderboard (June 11, 2026)

Coding agent benchmark — 113 tasks across TypeScript, Go, Python, JS, Rust.
Run on mini-swe-agent for consistency. Higher Pass@1 = better.
Source: https://deepswe.datacurve.ai/ — fetched via agent-browser.

| Rank | Model | Pass@1 | ±CI | Avg Cost | Avg Time | Out Tok |
|---|---|---|---|---|---|---|
| 1 | gpt-5.5 [xhigh] | 70% | ±3% | $6.61 | 21m | 47k |
| 2 | claude-opus-4.8 [max] | 58% | ±2% | $12.58 | 43m | 136k |
| 3 | gpt-5.4 [xhigh] | 56% | ±2% | $4.38 | 27m | 71k |
| 4 | claude-opus-4.7 [max] | 54% | ±5% | $18.19 | 39m | 103k |
| 5 | claude-sonnet-4.6 [high] | 32% | ±2% | $5.52 | 42m | 76k |
| 6 | gemini-3.5-flash [medium] | 28% | ±4% | $7.42 | 17m | 189k |
| 7 | claude-opus-4.6 [max] | 28% | ±4% | $5.39 | 30m | 44k |
| 8 | gpt-5.4-mini [xhigh] | 24% | ±3% | $2.08 | 33m | 135k |
| 9 | **kimi-k2.6** | **24%** | ±2% | **$3.16** | 56m | 84k |
| 10 | **minimax-m3** | **20%** | ±4% | **$5.57** | 57m | 98k |
| 11 | **mimo-v2.5-pro** | **19%** | ±2% | **$1.99** | 28m | 49k |
| 12 | **qwen3.7-max** | **18%** | ±1% | **$2.12** | 17m | 42k |
| 13 | **glm-5.1** | 18% | ±1% | $7.46 | 35m | 49k |
| 14 | grok-build-0.1 | 13% | ±2% | $6.60 | 44m | 52k |
| 15 | gemini-3.1-pro | 10% | ±3% | $1.84 | 36m | 53k |
| 16 | deepseek-v4-pro | 8% | ±3% | $4.22 | 37m | 50k |
| 17 | gemini-3-flash | 5% | ±2% | $1.53 | 39m | 233k |

Note: Page showed 17/20 models. 3 models hidden behind a dropdown filter.

### Go Model DeepSWE Score Update (June 11)

Three Go models now have official scores where they previously had estimates:

| Model | Old Est | Official Score | Change |
|---|---|---|---|
| **minimax-m3** | ~30-40% / 13.3%⁽¹⁾ | **20%±4%** | Lower than vendor claims, higher than independent run |
| **qwen3.7-max** | ~35-45% | **18%±1%** | Significantly lower than AA Index would suggest |
| **kimi-k2.6** | 24% | **24%±2%** | Confirmed ✅ |
| **mimo-v2.5-pro** | 19% | **19%±2%** | Confirmed ✅ |
| **glm-5.1** | 18% | **18%±1%** | Confirmed ✅ |

⁽¹⁾ entrpi/bleysg independent run (Jun 2) scored 13.3%. Official leaderboard (Jun 11) scores 20%±4%.
The difference may be due to updated mini-swe-agent configuration or different run parameters.

**Implication:** qwen3.7-max underperforms on agentic coding (18% DeepSWE) vs its reasoning benchmarks (AA 56.6, SWE-Pro 60.6%). It's still the best Oracle model on Go due to reasoning strength, but not the best for agentic fixer/orchestrator roles.

### Go Model DeepSWE Ranking

1. **kimi-k2.6** — 24%±2%, $3.16 — #1 Go model for coding agents
2. **minimax-m3** — 20%±4%, $5.57 — Strong multimodal, 1M ctx, but expensive per task
3. **mimo-v2.5-pro** — 19%±2%, $1.99 — Best value: quality per dollar
4. **qwen3.7-max** — 18%±1%, $2.12 — Best reasoning, weaker at agentic coding
5. **glm-5.1** — 18%±1%, $7.46 — Overpriced for the score

### Non-DeepSWE Benchmarks for Go Models

| Model | AA Index | SWE-Pro | SWE-rebench | AI Coding Daily |
|---|---|---|---|---|
| qwen3.7-max | **56.6** | **60.6%** | N/A | N/A |
| kimi-k2.6 | ~50 | ~50% | 46.5% | 14/20 |
| minimax-m3 | N/A | 59.0%† | **45.6%** | 15/20 |
| mimo-v2.5-pro | N/A | N/A | N/A | 13/20 |
| glm-5.1 | ~50 | ~56% | 50.7% | 9/20 |

† = Vendor-reported using Claude Code scaffolding. M3's SWE-rebench score (45.6%) uses the same harness as all models listed. M3 AI Coding Daily: 15/20 (tied Sonnet 4.6), but very slow (5:34 avg).

## SWE-rebench Leaderboard (May 15, 2026)

Software engineering benchmark — 110 problems from 86 repos, tool-use agentic evaluation.
Source: https://swe-rebench.com/

| Rank | Model | Resolved Rate | ±SEM | Pass@5 | Cost/Problem | Tokens/Problem |
|---|---|---|---|---|---|---|
| 1 | gpt-5.5-xhigh | 62.7% | ±0.91% | 70.0% | $2.25 | 2,120,660 |
| 2 | Codex | 60.4% | ±1.37% | 71.8% | $1.75 | 1,898,131 |
| 3 | Claude Code | 59.6% | ±1.98% | 72.7% | $1.74 | 1,878,248 |
| 4 | gpt-5.5-medium | 58.9% | ±0.78% | 70.0% | $0.98 | 708,418 |
| 5 | Claude Opus 4.8-xhigh | 56.4% | ±1.29% | 67.3% | $2.02 | 2,479,387 |
| 6 | gpt-5.4-medium | 54.9% | ±1.02% | 70.9% | $0.60 | 834,452 |
| 7 | Claude Opus 4.7-high | 53.1% | ±1.45% | 66.4% | $1.32 | 1,526,135 |
| 8 | Cursor | 53.0% | ±0.53% | 64.5% | $0.23 | 1,031,653 |
| 9 | Claude Sonnet 4.6-high | 51.3% | ±0.55% | 63.6% | $1.29 | 2,644,577 |
| 10 | Gemini 3.1 Pro Preview | 51.1% | ±1.20% | 66.4% | $0.75 | 1,545,445 |
| 11 | **GLM-5.1** | **50.7%** | ±0.93% | **65.5%** | **$0.94** | 2,664,001 |
| 12 | Claude Opus 4.6-high | 47.8% | ±1.37% | 60.9% | $1.53 | 1,828,649 |
| 13 | **Kimi K2.6** | **46.5%** | ±1.27% | **64.5%** | **$0.61** | 2,466,977 |
| 14 | GLM-4.7 | 38.2% | ±0.86% | 59.1% | $0.39 | 2,256,182 |

### Go models present on SWE-rebench

Only 2 opencode-go models have actual scores:

| Go Model | Resolved Rate | Cost/Problem | Verdict |
|---|---|---|---|
| **GLM-5.1** | 50.7% | $0.94 | Stronger than DeepSWE suggests (18%). Good council candidate |
| **Kimi K2.6** | 46.5% | $0.61 | Consistent mid-tier. Good Oracle/Designer choice |

Note: mimo-v2.5-pro, minimax-m2.7, deepseek-v4-flash, qwen3.* all show **N/A** — not evaluated.

### Benchmark comparison: DeepSWE vs SWE-rebench

Models appear on different scales. Relative rankings within Go models:

| Model | DeepSWE Pass@1 | SWE-rebench Resolved | SWE-Bench Pro | AA Index |
|---|---|---|---|---|
| qwen3.7-max | N/A | N/A | **60.6%** | **56.6** |
| kimi-k2.6 | 24% | 46.5% | ~50% | ~50 |
| glm-5.1 | 18% | 50.7% | ~56% | ~50 |
| minimax-m3 | **13.3%**\* | N/A | 59.0%† | N/A |

\* = Independent DeepSWE run by entrpi/bleysg (Jun 2, 2026) using mini-swe-agent, MiniMax-direct API. Strict 90-min budget. Median 80k output tokens, 325 steps, $7.48/task. Sits between glm-5.1 (18%) and gemini-3.1-pro (10%).
† = Vendor-reported by MiniMax using Claude Code scaffolding (stronger agent framework). Not comparable to mini-swe-agent scores.
AA Index = Artificial Analysis Intelligence Index v4.0 (independent composite).

### Go Model Benchmark Ranking (by independent data)

Based on independently verified benchmarks available:

1. **Qwen3.7 Max** — AA Index 56.6, SWE-Pro 60.6%, Terminal-Bench 2.0 69.7%. Clear #1 Go model.
2. **Kimi K2.6** — DeepSWE 24%, SWE-rebench 46.5%. Solid mid-tier.
3. **MiMo-V2.5-Pro** — DeepSWE 19%. Strong value fixer.
4. **GLM-5.1** — DeepSWE 18%, SWE-rebench 50.7%.
5. **MiniMax M3** — **DeepSWE 13.3%** (independent, entrpi/bleysg, Jun 2). Vendor-claimed SWE-Pro 59.0% used Claude Code scaffolding; on mini-swe-agent (same as DeepSWE leaderboard), M3 scores below mimo-v2.5-pro (19%). Extremely token-hungry: 80k median output, 325 steps, $7.48/task.
6. **DeepSeek V4 Pro** — DeepSWE 8%. Slow per user notes.
7. **DeepSeek V4 Flash** — Est ~8-12%. Fast, cheap, high limits.

## OpenCode Go Plan (June 13, 2026)

$10/mo ($5 first month). Limits in request count per model.
**NEW models:** MiniMax M3 (now 16K/mo, up from 7K), Qwen3.7 Max, Kimi K2.7 Code.
**REMOVED:** Qwen3.5 Plus. **DEPRECATED:** GLM-5.
**Major limit increases:** MiMo-V2.5 (+14×), MiMo-V2.5-Pro (+2.5×), MiniMax M3 (+2.3×), Qwen3.7 Plus (+32%).

| Model | Req/5h | Req/week | Req/month |
|---|---|---|---|
| DeepSeek V4 Flash | 31,650 | 79,050 | 158,150 |
| MiMo-V2.5 | 30,100 | 75,200 | 150,400 |
| Qwen3.7 Plus | 4,300 | 10,800 | 21,600 |
| MiniMax M2.5 | 6,300 | 15,900 | 31,800 |
| MiniMax M2.7 | 3,400 | 8,500 | 17,000 |
| DeepSeek V4 Pro | 3,450 | 8,550 | 17,150 |
| MiMo-V2.5-Pro | 3,250 | 8,150 | 16,300 |
| MiniMax M3 | 3,200 | 8,000 | 16,000 |
| Qwen3.6 Plus | 3,300 | 8,200 | 16,300 |
| Kimi K2.7 Code | 1,850 | 4,630 | 9,250 |
| Kimi K2.5 | 1,850 | 4,630 | 9,250 |
| GLM-5 | 1,150 | 2,880 | 5,750 |
| Kimi K2.6 | 1,150 | 2,880 | 5,750 |
| Qwen3.7 Max | 950 | 2,390 | 4,770 |
| GLM-5.1 | 880 | 2,150 | 4,300 |

## OpenCode Zen Pricing (June 1, 2026)

PAYG per 1M tokens (USD). Use when model isn't on Go or you exceed Go limits.
**NEW on Zen:** GPT-5.5 Pro, GPT-5.4 Pro, GPT-5.4 Nano, Claude Opus 4.8/4.7/4.5, Gemini 3.5 Flash, Grok Build 0.1, Qwen3.7 Max.

| Model | Input | Output | Cached Read |
|---|---|---|---|
| DeepSeek V4 Flash Free | Free | Free | Free |
| MiMo-V2.5 Free | Free | Free | Free |
| Nemotron 3 Super Free | Free | Free | Free |
| Big Pickle | Free | Free | Free |
| MiniMax M2.7 | $0.30 | $1.20 | $0.06 |
| MiniMax M2.5 | $0.30 | $1.20 | $0.06 |
| MiniMax M3 | $0.60 | $2.40 | $0.12 |
| DeepSeek V4 Flash | $0.14 | $0.28 | $0.03 |
| MiMo-V2.5 | $0.14 | $0.28 | $0.0028 |
| MiMo-V2.5-Pro | $1.74 | $3.48 | $0.0145 |
| Qwen3.5 Plus | $0.20 | $1.20 | $0.02 |
| Qwen3.6 Plus | $0.50 | $3.00 | $0.05 |
| Qwen3.7 Max | $2.50 | $7.50 | $0.50 |
| GLM-5 | $1.00 | $3.20 | $0.20 |
| GLM-5.1 | $1.40 | $4.40 | $0.26 |
| Kimi K2.5 | $0.60 | $3.00 | $0.10 |
| Kimi K2.6 | $0.95 | $4.00 | $0.16 |
| DeepSeek V4 Pro | $1.74 | $3.48 | $0.0145 |
| Grok Build 0.1 | $1.00 | $2.00 | $0.20 |
| Gemini 3.5 Flash | $1.50 | $9.00 | $0.15 |
| Gemini 3.1 Pro | $2.00 | $12.00 | $0.20 |
| Gemini 3 Flash | $0.50 | $3.00 | $0.05 |
| Claude Opus 4.8 | $5.00 | $25.00 | $0.50 |
| Claude Opus 4.7 | $5.00 | $25.00 | $0.50 |
| Claude Opus 4.6 | $5.00 | $25.00 | $0.50 |
| Claude Sonnet 4.6 | $3.00 | $15.00 | $0.30 |
| Claude Haiku 4.5 | $1.00 | $5.00 | $0.10 |
| GPT-5.5 | $5.00 | $30.00 | $0.50 |
| GPT-5.5 Pro | $30.00 | $180.00 | $30.00 |
| GPT-5.4 | $2.50 | $15.00 | $0.25 |
| GPT-5.4 Pro | $30.00 | $180.00 | $30.00 |
| GPT-5.4 Mini | $0.75 | $4.50 | $0.075 |
| GPT-5.4 Nano | $0.20 | $1.25 | $0.02 |

## Model to Provider Mapping

| Model | Go Available | Zen Available | Go ID | Zen ID |
|---|---|---|---|---|
| deepseek-v4-flash | ✅ | ✅ | opencode-go/deepseek-v4-flash | opencode/deepseek-v4-flash |
| deepseek-v4-pro | ✅ | ✅ | opencode-go/deepseek-v4-pro | opencode/deepseek-v4-pro |
| kimi-k2.6 | ✅ | ✅ | opencode-go/kimi-k2.6 | opencode/kimi-k2.6 |
| kimi-k2.5 | ✅ | ✅ | opencode-go/kimi-k2.5 | opencode/kimi-k2.5 |
| glm-5 | ✅ | ✅ | opencode-go/glm-5 | opencode/glm-5 ⚠️ deprecated |
| glm-5.1 | ✅ | ✅ | opencode-go/glm-5.1 | opencode/glm-5.1 |
| mimo-v2.5 | ✅ | ✅ | opencode-go/mimo-v2.5 | opencode/mimo-v2.5 |
| mimo-v2.5-pro | ✅ | ✅ | opencode-go/mimo-v2.5-pro | opencode/mimo-v2.5-pro |
| minimax-m2.5 | ✅ | ✅ | opencode-go/minimax-m2.5 | opencode/minimax-m2.5 |
| minimax-m2.7 | ✅ | ✅ | opencode-go/minimax-m2.7 | opencode/minimax-m2.7 |
| **minimax-m3** | ✅ | ✅ | **opencode-go/minimax-m3** | **opencode/minimax-m3** |
| **qwen3.7-max** | ✅ | ✅ | **opencode-go/qwen3.7-max** | **opencode/qwen3.7-max** |
| qwen3.6-plus | ✅ | ✅ | opencode-go/qwen3.6-plus | opencode/qwen3.6-plus |
| qwen3.5-plus | ❌ | ✅ | — | opencode/qwen3.5-plus |
| claude-opus-4.8 | ❌ | ✅ | — | opencode/claude-opus-4-8 |
| claude-opus-4.7 | ❌ | ✅ | — | opencode/claude-opus-4-7 |
| claude-opus-4.6 | ❌ | ✅ | — | opencode/claude-opus-4-6 |
| claude-sonnet-4.6 | ❌ | ✅ | — | opencode/claude-sonnet-4-6 |
| gemini-3.5-flash | ❌ | ✅ | — | opencode/gemini-3.5-flash |
| gemini-3.1-pro | ❌ | ✅ | — | opencode/gemini-3.1-pro |
| gpt-5.5 | ❌ | ✅ | — | opencode/gpt-5.5 |
| gpt-5.5-pro | ❌ | ✅ | — | opencode/gpt-5.5-pro |
| gpt-5.4 | ❌ | ✅ | — | opencode/gpt-5.4 |
| gpt-5.4-pro | ❌ | ✅ | — | opencode/gpt-5.4-pro |
| gpt-5.4-mini | ❌ | ✅ | — | opencode/gpt-5.4-mini |
| grok-build-0.1 | ❌ | ✅ | — | opencode/grok-build-0.1 |

### AI Coding Daily Leaderboard (Jun 2, 2026)

14 models tested on 4 Laravel/React projects, 5 runs each, max 20 pts.
Source: https://aicodingdaily.com/article/llm-coding-leaderboard-may-15th-11-models-tested

| Rank | Model | Score/20 | Avg Time | Avg Cost |
|---|---|---|---|---|
| 1 | Opus 4.8 (medium) | 20 | 01:40 | $0.64 |
| 2 | Opus 4.7 (high) | 20 | 02:17 | $0.83 |
| 3 | GPT-5.5 (medium) | 20 | 03:37 | $1.15 |
| 4 | Opus 4.7 (medium) | 18 | 01:54 | $0.72 |
| 5 | Composer 2.5 | 17 | 01:14 | $0.18 |
| 6 | Gemini-3.1-Pro | 17 | 01:52 | $0.31 |
| 7 | Sonnet 4.6 | 15 | 02:17 | $0.47 |
| **8** | **MiniMax M3** | **15** | **05:34** | **$0.40** |
| 9 | Kimi K2.6 | 14 | 04:28 | $0.18 |
| 10 | MiMo 2.5 Pro | 13 | 03:22 | $0.17 |
| 11 | GLM-5.1 | 9 | 03:22 | $0.24 |
| 12 | Deepseek-V4-Pro | 9 | 05:55 | $0.11 |
| 13 | Qwen 3.6 Plus | 6 | 03:02 | $0.07 |
| 14 | Minimax M2.7 | 2 | 01:57 | $0.03 |

**M3 verdict on this benchmark:** 15/20 (tied Sonnet 4.6). Beats Kimi K2.6 and MiMo-2.5-Pro. **Very slow** (5:34 avg — slowest in top 10). Simple Laravel/React tasks don't stress long-horizon reasoning like DeepSWE, so this score overstates M3's real capability vs DeepSWE's 13.3%.

## Past Benchmark History (from bak file, May 9 2026)

Top performers from the user's own codeneedle benchmark:

| Model | Pass Rate | Accuracy | Avg Latency | Endpoint |
|---|---|---|---|---|
| qwen3.6-plus (go) | 100% | 100% | 52.5s | Go |
| qwen3.6-plus (zen) | 100% | 100% | 57.9s | Zen |
| glm-5 (go) | 100% | 99.5% | 27.7s | Go |
| kimi-k2.6 (zen) | 100% | ~95% | ~10s | Zen |
| deepseek-v4-flash (go) | 100% | 99.5% | 80.6s | Go |

### New Models Available on Go (June 2026)

| Model | Req/mo (live) | Pricing I/O | Key Strength | Caveat |
|---|---|---|---|---|
| **Qwen3.7 Max** | 4,770 | $2.50/$7.50 | AA Index 56.6, SWE-Pro 60.6%, 1M ctx | DeepSWE only 18% ±1% for agentic coding |
| **MiniMax M3** | 16,000 | $0.30/$1.20† | DeepSWE 20%±4%, SWE-rebench 45.6%, multimodal, 1M ctx | Very slow (57m avg DeepSWE, 5:34 AI Coding) |
| **Kimi K2.7 Code** | 9,250 | $0.95/$4.00 | New coding-focused Kimi variant | No independent benchmarks yet |

† M3 Zen price dropped 50% from $0.60/$2.40 to $0.30/$1.20 (confirmed Jun 16 scrape). Go pricing unchanged.

### Models Removed / Deprecated

- **Qwen3.5 Plus** — dropped from Go model list
- **GLM-5** — deprecated on Zen (May 14, 2026); still listed on Go but likely removed soon

### Major Limit / Price Changes

- **MiMo-V2.5** — limits INCREASED 14× (2,150→30,100/5h, 10,900→150,400/mo). Now the highest-volume Go model after DS-V4-Flash.
- **MiMo-V2.5-Pro** — limits increased 2.5× (1,290→3,250/5h, 6,450→16,300/mo).
- **MiniMax M3** — limits increased 2.3× (1,400→3,200/5h, 7,000→16,000/mo). Now viable for Observer role.
- **Qwen3.7 Max** — added at 950/5h, 4,770/mo.
- **Qwen3.7 Plus** — limits increased 32% (3,300→4,300/5h, 16,300→21,600/mo).
- **Kimi K2.7 Code** — new model added at 1,350/5h, 9,250/mo (live scrape Jun 16 shows 1,350, down from 1,850 in earlier docs).

### External Benchmarks & Reviews (June 2026)

- **Artificial Analysis Intelligence Index v4.0** — Independent composite of 10 evaluations (agents, coding, general, science). Claude Opus 4.8 = 61.4 (top). Qwen3.7 Max = 56.6 (highest Chinese model). Source: artificialanalysis.ai
- **DeepSWE** (datacurve.ai, Jun 11) — 113 contamination-free tasks. 17/20 models shown. GPT-5.5 leads at 70%. Go models: kimi-k2.6 24%, minimax-m3 20%, mimo-v2.5-pro 19%, qwen3.7-max 18%, glm-5.1 18%. Previously missing scores now confirmed. Source: agent-browser snapshot (this session).
- **MiniMax M3 independent DeepSWE** (entrpi.github.io, Jun 2) — **13.3%** pass@1 strict (15/113). Official leaderboard (Jun 11) now shows 20%±4%, suggesting updated configuration. Median 80k output tokens, 325 steps, $7.48/task. M3 remains token-hungry even at 20%. Source: https://entrpi.github.io/misc/deep-swe-minimax-m3/
- **AI Coding Daily** (aicodingdaily.com, Jun 2) — 14 models on 4 Laravel/React projects. MiniMax M3 scores **15/20** (#8, tied Sonnet 4.6). Very slow (5:34 avg). Simpler benchmark — doesn't stress long-horizon like DeepSWE. Source: https://aicodingdaily.com/article/llm-coding-leaderboard-may-15th-11-models-tested
- **Kilo.ai Live Leaderboard** (kilo.ai/leaderboard) — Real token usage from 3M+ developers. MiniMax M3 at **47.6%** completion rate, $10.35/attempt. Live preference-based ranking, not controlled benchmark.
- **SWE-rebench** (swe-rebench.com, fetched Jun 13) — 110 problems, tool-use agentic eval. Now includes MiniMax M3 at **45.6%** resolved rate. Go model ranking on SWE-rebench: GLM-5.1 50.7% > Kimi K2.6 46.5% > MiniMax M3 45.6%. Source: agent-browser snapshot (this session).
- **Build Fast with AI June 2026 Leaderboard** — Comprehensive 10-model comparison across coding, agentic, reasoning, pricing. Rates Qwen3.7 Max as "rational alternative to Opus 4.8 at 1/6 price for agentic coding."

### Fresh Data Delta (Jun 16 scrape vs REFERENCE)

| Finding | REFERENCE.md (Jun 13) | Live Scrape (Jun 16) |
|---|---|---|
| Kimi K2.7 Code 5h limit | 1,850 | **1,350** ↓ |
| MiniMax M3 Zen pricing | $0.60/$2.40 | **$0.30/$1.20** ↓ 50% |
| DeepSeek V4 Pro Zen cached | $0.0145 | **$0.145** ↑ 10× |
| Claude Fable 5 on Zen | Not listed | **New** ($10/$50) |
| Claude Sonnet 4 status | Active | **Deprecated** (Jun 15) |
| DeepSeek V4 Flash cached read | $0.03 | **$0.028** ↓ minor |

### Key Operational Findings

- **kimi-k2.6** needs `prefill_no_think=true` to suppress excessive CoT
- **deepseek-v4-flash** needs 24k max_tokens to avoid empty responses
- **deepseek-v4-pro** is impractically slow (~5-10 min/query)
- **minimax-m2.5** and **minimax-m2.5-free** are broken (API malformed responses)
- **nemotron-3-super-free** is unstable (intermittent failures)
- **big-pickle** is experimental, not production-ready
