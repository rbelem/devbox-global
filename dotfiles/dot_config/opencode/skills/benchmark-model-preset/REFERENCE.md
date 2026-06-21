# Benchmark & Pricing Reference

## DeepSWE Leaderboard

Coding agent benchmark — 113 tasks across TypeScript, Go, Python, JS, Rust.
Run on mini-swe-agent for consistency. Higher Pass@1 = better.
Source: https://deepswe.datacurve.ai/ — fetched via agent-browser.

### v1.1 (June 14, 2026) — Top-8 Frontier

| Rank | Model | Pass@1 | ±CI | Avg Cost | Out Tok | Steps |
|---|---|---|---|---|---|---|
| 1 | claude-fable-5 [max] | 70% | ±4% | $21.63 | 119k | 88 |
| 2 | gpt-5.5 [xhigh] | 67% | ±6% | $7.23 | 46k | 82 |
| 3 | claude-opus-4.8 [max] | 59% | ±2% | $13.22 | 135k | 120 |
| 4 | gpt-5.4 [xhigh] | 52% | ±2% | $5.65 | 71k | 70 |
| 5 | gemini-3.5-flash [medium] | 37% | ±2% | $7.34 | 276k | 86 |
| 6 | **kimi-k2.7-code** | **31%** | ±1% | **$2.82** | 59k | 149 |
| 7 | claude-sonnet-4.6 [high] | 30% | ±4% | $5.52 | 76k | 134 |
| 8 | gemini-3.1-pro [high] | 12% | ±2% | $9.48 | 196k | 81 |

Note: v1.1 only shows 8 frontier models. Older Go models are on the v1 tab.

### v1 (June 11, 2026) — 17 Models (Legacy)

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
| 9 | **kimi-k2.6** | **24%** | ±2% | $3.16 | 56m | 84k |
| 10 | **minimax-m3** | **20%** | ±4% | $5.57 | 57m | 98k |
| 11 | **mimo-v2.5-pro** | **19%** | ±2% | $1.99 | 28m | 49k |
| 12 | **qwen3.7-max** | **18%** | ±1% | $2.12 | 17m | 42k |
| 13 | glm-5.1 | 18% | ±1% | $7.46 | 35m | 49k |
| 14 | grok-build-0.1 | 13% | ±2% | $6.60 | 44m | 52k |
| 15 | gemini-3.1-pro | 10% | ±3% | $1.84 | 36m | 53k |
| 16 | deepseek-v4-pro | 8% | ±3% | $4.22 | 37m | 50k |
| 17 | gemini-3-flash | 5% | ±2% | $1.53 | 39m | 233k |

Note: Page showed 17/20 models. 3 models hidden behind a dropdown.

## GLM-5.2 Benchmark Summary (Released June 17, 2026)

GLM-5.2 (744B MoE, 40B active, MIT license, 1M ctx) is Z.ai's flagship.
**Variant:** Two reasoning effort levels — `max` (default, used for all benchmarks below) and `high`.

**Effort note:** `max` is the default — if `reasoning_effort` is left unset, the model runs at Max.
To use `high`, you must explicitly pass `reasoning_effort="high"`.

### Official Benchmarks (from Z.ai model card, Jun 17)

| Benchmark | GLM-5.2 | GLM-5.1 | Qwen3.7-Max | MiniMax M3 | Opus 4.8 | GPT-5.5 |
|---|---|---|---|---|---|---|
| **DeepSWE** | **46.2** | 18 | 18 | 20 | 58 | 70 |
| SWE-bench Pro | **62.1** | 58.4 | 60.6 | 59 | 69.2 | 58.6 |
| Terminal-Bench 2.1 | **81.0** | 63.5 | 75 | 65 | 85 | 84 |
| FrontierSWE | **74.4** | 30.5 | — | — | 75.1 | 72.6 |
| ProgramBench | **63.7** | 50.9 | — | — | 71.9 | 70.8 |
| NL2Repo | **48.9** | 42.7 | 47.2 | 42.1 | 69.7 | 50.7 |
| SWE-Marathon | **13.0** | 1.0 | — | — | 26.0 | 12.0 |
| PostTrainBench | **34.3** | 20.1 | — | — | 37.2 | 28.4 |
| MCP-Atlas | **76.8** | 71.8 | 76.4 | 74.2 | 77.8 | 75.3 |
| Tool-Decathlon | **48.2** | 40.7 | — | — | 59.9 | 55.6 |
| AIME 2026 | **99.2** | 95.3 | 97 | — | 95.7 | 98.3 |
| GPQA-Diamond | **91.2** | 86.2 | 90 | 93 | 93.6 | 93.6 |
| AA Index v4.1 | **51** | 40 | 56.6 | 44 | 61.4 | ~55 |

### Key Takeaways

1. **GLM-5.2 obliterates qwen3.7-max on agentic coding**: DeepSWE **46.2 vs 18** (2.6×), Terminal-Bench **81 vs 75**, SWE-bench Pro **62.1 vs 60.6**.
2. **GLM-5.2 vs Opus 4.8**: Trails by ~1% on FrontierSWE (74.4 vs 75.1), ~10% on DeepSWE. Beats Opus on math (AIME 99.2 vs 95.7). Opus leads on NL2Repo (69.7 vs 48.9) and SWE-Marathon (26 vs 13).
3. **GLM-5.2 vs GPT-5.5**: Beats GPT-5.5 on SWE-bench Pro (62.1 vs 58.6), FrontierSWE (74.4 vs 72.6), MCP-Atlas (76.8 vs 75.3) — at **~1/6 the cost**.
4. **Price**: $1.40/$4.40 vs qwen3.7-max $2.50/$7.50 (~45% cheaper).

## Arena AI Leaderboard

Source: https://arena.ai/leaderboard/ (formerly LMSYS Chatbot Arena)

### Agent Arena (June 2026)

Measures models on real-world long-horizon agentic tasks with web search, filesystem, and terminal tools. Uses causal tracing methodology.

| Rank | Model | Score | Verdict |
|---|---|---|---|
| 1 | Claude Fable 5 (High) | 14.05% | Frontier |
| 2 | Claude Opus 4.8 (Thinking) | 8.85% | + |
| ... | ... | ... | |
| **10** | **GLM-5.2 (Max)** | **4.51%** | **#1 open model** |
| 13 | GLM-5.1 | — | ↑3 spots from 5.1 |

GLM-5.2 (Max): #3 Confirmed Task Success (+9.4%), #3 Praise vs Complaint (+14.9%).
Weakness: #20 Steerability (-6.0%).

### Overall Arena (Elo)

GLM-5.2 (Max) at **1595 Elo**, ranks #2 overall behind Claude Fable 5 (1654).
GLM-5.2 (max) ranks #1 open-weight by a wide margin.

## SWE-rebench Leaderboard (May 15, 2026)

Software engineering benchmark — 110 problems from 86 repos, tool-use agentic evaluation.
Source: https://swe-rebench.com/

| Rank | Model | Resolved Rate | ±SEM | Pass@5 | Cost/Problem |
|---|---|---|---|---|---|
| 1 | gpt-5.5-xhigh | 62.7% | ±0.91% | 70.0% | $2.25 |
| 2 | Codex | 60.4% | ±1.37% | 71.8% | $1.75 |
| 3 | Claude Code | 59.6% | ±1.98% | 72.7% | $1.74 |
| 4 | gpt-5.5-medium | 58.9% | ±0.78% | 70.0% | $0.98 |
| 5 | Claude Opus 4.8-xhigh | 56.4% | ±1.29% | 67.3% | $2.02 |
| 6 | gpt-5.4-medium | 54.9% | ±1.02% | 70.9% | $0.60 |
| 7 | Claude Opus 4.7-high | 53.1% | ±1.45% | 66.4% | $1.32 |
| 8 | Cursor | 53.0% | ±0.53% | 64.5% | $0.23 |
| 9 | Claude Sonnet 4.6-high | 51.3% | ±0.55% | 63.6% | $1.29 |
| 10 | Gemini 3.1 Pro Preview | 51.1% | ±1.20% | 66.4% | $0.75 |
| 11 | **GLM-5.1** | **50.7%** | ±0.93% | **65.5%** | **$0.94** |
| 12 | Claude Opus 4.6-high | 47.8% | ±1.37% | 60.9% | $1.53 |
| 13 | **Kimi K2.6** | **46.5%** | ±1.27% | **64.5%** | **$0.61** |
| 14 | GLM-4.7 | 38.2% | ±0.86% | 59.1% | $0.39 |

### Go models on SWE-rebench

Only 2 opencode-go models have actual scores:

| Go Model | Resolved Rate | Cost/Problem | Verdict |
|---|---|---|---|
| **GLM-5.1** | 50.7% | $0.94 | Stronger than DeepSWE suggests (18%). Good council candidate |
| **Kimi K2.6** | 46.5% | $0.61 | Consistent mid-tier. Good Oracle/Designer choice |

Note: mimo-v2.5-pro, minimax-m2.7, deepseek-v4-flash, qwen3.* all show **N/A** — not evaluated.

### Go Model Benchmark Ranking (June 2026, all sources)

| Rank | Model | DeepSWE | SWE-Pro | Terminal-Bench | AA Index | Price (I/O) |
|---|---|---|---|---|---|---|
| **1** | **GLM-5.2** | **46.2** | **62.1** | **81.0** | **51** | **$1.40/$4.40** |
| 2 | Kimi K2.7 Code | 31† | — | — | — | $0.95/$4.00 |
| 3 | Kimi K2.6 | 24 | ~50 | — | ~50 | $0.95/$4.00 |
| 4 | MiniMax M3 | 20 | 59 | — | 44 | $0.30/$1.20* |
| 5 | MiMo-V2.5-Pro | 19 | — | — | — | $1.74/$3.48 |
| 6 | Qwen3.7 Max | 18 | 60.6 | 75 | **56.6** | $2.50/$7.50 |
| 7 | GLM-5.1 | 18 | 58.4 | 63.5 | 40 | $1.40/$4.40 |

† = DeepSWE v1.1 score (different benchmark version than v1 scores for other models).
\* = Zen pricing; Go pricing is $0.30/$1.20.

## OpenCode Go Plan (June 2026)

$10/mo ($5 first month). Limits in request count per model.
**NEW models:** GLM-5.2, Kimi K2.7 Code, GLM-5.2, GLM-5.2.
**REMOVED:** Qwen3.5 Plus. **DEPRECATED:** GLM-5.

| Model | Req/5h | Req/week | Req/month |
|---|---|---|---|
| DeepSeek V4 Flash | 31,650 | 79,050 | 158,150 |
| MiMo-V2.5 | 30,100 | 75,200 | 150,400 |
| Qwen3.7 Plus | 4,300 | 10,800 | 21,600 |
| MiniMax M2.7 | 3,400 | 8,500 | 17,000 |
| DeepSeek V4 Pro | 3,450 | 8,550 | 17,150 |
| MiniMax M3 | 3,200 | 8,000 | 16,000 |
| MiMo-V2.5-Pro | 3,250 | 8,150 | 16,300 |
| Qwen3.6 Plus | 3,300 | 8,200 | 16,300 |
| Kimi K2.7 Code | 1,350 | 4,630 | 9,250 |
| Kimi K2.6 | 1,150 | 2,880 | 5,750 |
| Qwen3.7 Max | 950 | 2,390 | 4,770 |
| **GLM-5.2** | **880** | **2,150** | **4,300** |
| GLM-5.1 | 880 | 2,150 | 4,300 |

Note: GLM-5.2 and GLM-5.1 have identical limits (4,300/mo). GLM-5 deprecated.

## OpenCode Go Pricing per 1M Tokens (June 2026)

| Model | Input | Output | Cached Read |
|---|---|---|---|
| **GLM-5.2** | **$1.40** | **$4.40** | **$0.26** |
| GLM-5.1 | $1.40 | $4.40 | $0.26 |
| Kimi K2.7 Code | $0.95 | $4.00 | $0.19 |
| Kimi K2.6 | $0.95 | $4.00 | $0.16 |
| MiMo V2.5 | $0.14 | $0.28 | $0.0028 |
| MiMo V2.5 Pro | $1.74 | $3.48 | $0.0145 |
| MiniMax M3 | $0.30 | $1.20 | $0.06 |
| MiniMax M2.7 | $0.30 | $1.20 | $0.06 |
| Qwen3.7 Max | $2.50 | $7.50 | $0.50 |
| Qwen3.7 Plus (≤256K) | $0.40 | $1.60 | $0.04 |
| Qwen3.6 Plus (≤256K) | $0.50 | $3.00 | $0.05 |
| DeepSeek V4 Pro | $1.74 | $3.48 | $0.0145 |
| DeepSeek V4 Flash | $0.14 | $0.28 | $0.0028 |

## OpenCode Zen Pricing (June 2026)

PAYG per 1M tokens (USD). Use when model isn't on Go or you exceed Go limits.
**Key changes:** MiniMax M3 dropped 50% to $0.30/$1.20. Claude Fable 5 added ($10/$50).

| Model | Input | Output | Cached Read |
|---|---|---|---|
| DeepSeek V4 Flash Free | Free | Free | Free |
| MiMo-V2.5 Free | Free | Free | Free |
| Nemotron 3 Super Free | Free | Free | Free |
| Big Pickle | Free | Free | Free |
| MiniMax M3 | $0.30 | $1.20 | $0.06 |
| MiniMax M2.7 | $0.30 | $1.20 | $0.06 |
| DeepSeek V4 Flash | $0.14 | $0.28 | $0.028 |
| MiMo-V2.5 | $0.14 | $0.28 | $0.0028 |
| MiMo-V2.5-Pro | $1.74 | $3.48 | $0.0145 |
| Qwen3.7 Max | $2.50 | $7.50 | $0.50 |
| Qwen3.6 Plus | $0.50 | $3.00 | $0.05 |
| GLM-5.2 | $1.40 | $4.40 | $0.26 |
| GLM-5.1 | $1.40 | $4.40 | $0.26 |
| Kimi K2.6 | $0.95 | $4.00 | $0.16 |
| DeepSeek V4 Pro | $1.74 | $3.48 | $0.145 |
| Claude Fable 5 | $10.00 | $50.00 | $1.00 |
| Claude Opus 4.8 | $5.00 | $25.00 | $0.50 |
| GPT-5.5 (≤272K) | $5.00 | $30.00 | $0.50 |
| GPT-5.4 (≤272K) | $2.50 | $15.00 | $0.25 |
| GPT-5.4 Mini | $0.75 | $4.50 | $0.075 |
| Gemini 3.1 Pro (≤200K) | $2.00 | $12.00 | $0.20 |
| Gemini 3.5 Flash | $1.50 | $9.00 | $0.15 |

## Model to Provider Mapping

| Model | Go | Zen | Go ID | Zen ID |
|---|---|---|---|---|
| **glm-5.2** | ✅ | ✅ | opencode-go/glm-5.2 | opencode/glm-5-2 |
| glm-5.1 | ✅ | ✅ | opencode-go/glm-5.1 | opencode/glm-5.1 |
| glm-5 | ❌ | ✅⚠️ | — (deprecated) | opencode/glm-5 (deprecated May 14) |
| deepseek-v4-flash | ✅ | ✅ | opencode-go/deepseek-v4-flash | opencode/deepseek-v4-flash |
| deepseek-v4-pro | ✅ | ✅ | opencode-go/deepseek-v4-pro | opencode/deepseek-v4-pro |
| kimi-k2.7-code | ✅ | ❌ | opencode-go/kimi-k2.7-code | — |
| kimi-k2.6 | ✅ | ✅ | opencode-go/kimi-k2.6 | opencode/kimi-k2.6 |
| mimo-v2.5 | ✅ | ✅ | opencode-go/mimo-v2.5 | opencode/mimo-v2.5 |
| mimo-v2.5-pro | ✅ | ✅ | opencode-go/mimo-v2.5-pro | opencode/mimo-v2.5-pro |
| minimax-m3 | ✅ | ✅ | opencode-go/minimax-m3 | opencode/minimax-m3 |
| qwen3.7-max | ✅ | ✅ | opencode-go/qwen3.7-max | opencode/qwen3.7-max |
| qwen3.6-plus | ✅ | ✅ | opencode-go/qwen3.6-plus | opencode/qwen3.6-plus |
| qwen3.5-plus | ❌ | ✅ | — | opencode/qwen3.5-plus |
| claude-opus-4.8 | ❌ | ✅ | — | opencode/claude-opus-4-8 |
| gpt-5.5 | ❌ | ✅ | — | opencode/gpt-5.5 |
| gemini-3.1-pro | ❌ | ✅ | — | opencode/gemini-3.1-pro |

### AI Coding Daily Leaderboard (Jun 2, 2026)

14 models tested on 4 Laravel/React projects, 5 runs each, max 20 pts.

| Rank | Model | Score/20 | Avg Time | Avg Cost |
|---|---|---|---|---|
| 1 | Opus 4.8 (medium) | 20 | 01:40 | $0.64 |
| 2 | Opus 4.7 (high) | 20 | 02:17 | $0.83 |
| 3 | GPT-5.5 (medium) | 20 | 03:37 | $1.15 |
| ... | ... | | | |
| 8 | **MiniMax M3** | **15** | **05:34** | **$0.40** |
| 9 | Kimi K2.6 | 14 | 04:28 | $0.18 |
| 10 | MiMo 2.5 Pro | 13 | 03:22 | $0.17 |
| 11 | GLM-5.1 | 9 | 03:22 | $0.24 |
| 13 | Qwen 3.6 Plus | 6 | 03:02 | $0.07 |

## Past Benchmark History (from bak file, May 9 2026)

User's own codeneedle benchmark:

| Model | Pass Rate | Accuracy | Avg Latency | Endpoint |
|---|---|---|---|---|
| qwen3.6-plus (go) | 100% | 100% | 52.5s | Go |
| deepseek-v4-flash (go) | 100% | 99.5% | 80.6s | Go |
| kimi-k2.6 (zen) | 100% | ~95% | ~10s | Zen |

## Key Operational Findings

- **GLM-5.2**: variant `"max"` recommended for coding (default). `"high"` for faster/cheaper.
- **kimi-k2.6** needs `prefill_no_think=true` to suppress excessive CoT
- **deepseek-v4-flash** needs 24k max_tokens to avoid empty responses
- **deepseek-v4-pro** is impractically slow (~5-10 min/query)
- **minimax-m2.5** and **minimax-m2.5-free** are broken (API malformed responses)
- **nemotron-3-super-free** is unstable
- **big-pickle** is experimental, not production-ready

## External Benchmarks & Reviews (June 2026)

- **Artificial Analysis Intelligence Index v4.1** (Jun 17) — GLM-5.2 scores **51** (#1 open-weights). Leads MiniMax-M3 (44), DeepSeek V4 Pro (44), Kimi K2.6 (43). On Intelligence vs Cost per Task Pareto frontier at ~$0.46/task. Source: artificialanalysis.ai
- **DeepSWE v1.1** (datacurve.ai, Jun 14) — GLM-5.2 not shown (v1.1 only has 8 frontier models). kimi-k2.7-code at **31%±1%** — beats claude-sonnet-4.6 (30%). Source: agent-browser (this session).
- **DeepSWE v1** (datacurve.ai, Jun 11) — 17 models. Go models: kimi-k2.6 24%, minimax-m3 20%, mimo-v2.5-pro 19%, qwen3.7-max 18%, glm-5.1 18%. Source: agent-browser.
- **Agent Arena** (arena.ai, Jun 16) — GLM-5.2 (Max) #10 overall, #1 open model by wide margin. #3 Confirmed Task Success. Source: arena.ai/leaderboard/agent
- **LiveBench** (livebench.ai) — GLM 5.2 overall 76.24. Coding 78.63, Math 79.65, Reasoning 73.33, Language 89.78. Source: livebench.ai
- **SWE-rebench** (Jun 13) — Only GLM-5.1 (50.7%) and Kimi K2.6 (46.5%) have scores. Source: agent-browser.
- **TechStackups** (Jun 18) — Independent GLM-5.2 vs Opus 4.8 real-world build test: GLM was 2× slower (1h10m vs 33m), but 4× cheaper ($5.39 vs $21.92). Source: techstackups.com

## GLM-5.2 Architecture Notes

- **Parameters**: ~753B total, 40B active (MoE, BF16)
- **Context**: 1M tokens (1,048,576)
- **Max output**: up to 128K tokens
- **License**: MIT (open weights)
- **Architecture**: IndexShare sparse attention (reuses indexer across every 4 layers, 2.9× FLOP reduction at 1M)
- **Effort levels**: `max` (default) and `high`. Set via `reasoning_effort` param.
  - Max recommended for coding tasks (all benchmark scores use Max)
  - High for faster/cheaper when quality can be traded
  - Thinking can be disabled via `thinking: {"type": "disabled"}`
- **Multimodal**: Text-only (no vision)
- **Coding Plan quota**: 3× during peak hours (14:00-18:00 Beijing), 2× off-peak
  - Promotional: off-peak billed at 1× through Sep 2026
  - Peak hours are UTC+8 (Beijing Time)
