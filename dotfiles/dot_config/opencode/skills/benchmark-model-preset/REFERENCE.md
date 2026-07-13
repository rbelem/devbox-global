# Benchmark & Pricing Reference

## DeepSWE Leaderboard

Coding agent benchmark — 113 tasks across TypeScript, Go, Python, JS, Rust.
Run on mini-swe-agent for consistency. Higher Pass@1 = better.
Source: https://deepswe.datacurve.ai/ — fetched via agent-browser.

### v1.1 (July 1, 2026) — Top-10 Frontier

| Rank | Model | Pass@1 | ±CI | Avg Cost | Out Tok | Steps |
|---|---|---|---|---|---|---|
| 1 | claude-fable-5 [max] | 70% | ±4% | $21.63 | 119k | 88 |
| 2 | gpt-5.5 [xhigh] | 67% | ±6% | $7.23 | 46k | 82 |
| 3 | claude-opus-4.8 [max] | 59% | ±2% | $13.22 | 135k | 120 |
| 4 | claude-sonnet-5 [max] | 54% | ±4% | $26.40 | 214k | 268 |
| 5 | gpt-5.4 [xhigh] | 52% | ±2% | $5.65 | 71k | 70 |
| **6** | **glm-5.2 [max]** ⚡ | **44%** | ±2% | **$3.92** | 78k | 129 |
| 7 | gemini-3.5-flash [medium] | 37% | ±2% | $7.34 | 276k | 86 |
| **8** | **kimi-k2.7-code** ⚡ | **31%** | ±1% | **$2.82** | 59k | 149 |
| 9 | claude-sonnet-4.6 [high] | 30% | ±4% | $5.52 | 76k | 134 |
| 10 | gemini-3.1-pro [high] | 12% | ±2% | $9.48 | 196k | 81 |

⚡ = Available on opencode-go
Note: v1.1 updated to 10 models. GLM-5.2 independently verified at 44%±2% (vs 46% Z.ai self-reported). kimi-k2.7-code now on v1.1 leaderboard. Older Go models are on the v1 tab.

### v1 (June 11, 2026) — 17 Models (Legacy)

| Rank | Model | Pass@1 | ±CI | Avg Cost | Avg Time | Out Tok |
|---|---|---|---|---|---|---|---|
| 1 | gpt-5.5 [xhigh] | 70% | ±3% | $6.61 | 21m | 47k |
| 2 | claude-opus-4.8 [max] | 58% | ±2% | $12.58 | 43m | 136k |
| 3 | gpt-5.4 [xhigh] | 56% | ±2% | $4.38 | 27m | 71k |
| 4 | claude-opus-4.7 [max] | 54% | ±5% | $18.19 | 39m | 103k |
| — | **GLM-5.2** ⚡† | **46%** | — | — | — | — |
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

Note: Page showed 17/20 models. 3 models hidden behind a dropdown filter.
† **GLM-5.2** scored **44%±2%** on DeepSWE v1.1 leaderboard (Jul 1, independently verified). Z.ai's self-reported blog score was 46.2%. The v1.1 leaderboard now shows 44%±2% — still #1 Go model by 2.4× margin. See "DeepSWE v1.1" and "GLM-5.2 Full Benchmark Table" sections below.

## GLM-5.2 Benchmark Summary (Released June 17, 2026)

GLM-5.2 (744B MoE, 40B active, MIT license, 1M ctx) is Z.ai's flagship.
**Variant:** Two reasoning effort levels — `max` (default, used for all benchmarks below) and `high`.

**Effort note:** `max` is the default — if `reasoning_effort` is left unset, the model runs at Max.
To use `high`, you must explicitly pass `reasoning_effort="high"`.

### Official Benchmarks (from Z.ai model card, Jun 17)

| Benchmark | GLM-5.2 | GLM-5.1 | Qwen3.7-Max | MiniMax M3 | Opus 4.8 | GPT-5.5 |
|---|---|---|---|---|---|---|
| **DeepSWE** | **46.2** (44±2 indep.) | 18 | 18 | 20 | 58 | 70 |
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

### Agent Arena (July 8, 2026)

Measures models on real-world long-horizon agentic tasks with web search, filesystem, and terminal tools. Uses causal tracing methodology.
**947K sessions, 32 models** (up from 786K/28 on Jun 15).

| Rank | Model | Score | Verdict |
|---|---|---|---|
| 1 | Claude Fable 5 (High) | +14.10% | Frontier |
| 2 | Claude Opus 4.8 (Thinking) | +9.76% | + |
| ... | ... | ... | |
| **10** | **GLM-5.2 (Max)** ⚡ | **+6.54%** | **#1 open model — BIG jump from +4.37%** |
| 15 | **Qwen3.7 Max** ⚡ | **+0.36%** | **Massive improvement from -4.24%** |

**GLM-5.2 (Max) now dominates on Tool Hallucination:** #1 (tied) at 1.24% — lowest in the entire leaderboard.
Also #3 Confirmed Success (+9.46%), #6 Praise/Complaint (+13.74%).

### Go Model DeepSWE Ranking

1. **GLM-5.2** — **44%** (independently verified on v1.1, Jul 1), $1.40/$4.40 — **#1 Go model by 2.4× margin**. 1M ctx, MIT license, Arena Agent +6.54%
2. **Hy3** — **28**† DeepSWE (Tencent self-reported, not on official leaderboard), SWE-bench Verified **78%** ⚠️ (Tencent-reported, not on official SWE-bench leaderboard), Apache 2.0, 295B MoE/21B active — **OpenRouter only: $0.14/$0.58**
3. **kimi-k2.7-code** — 31%±1%, $2.82 — Rising coding specialist. DeepSWE beats claude-sonnet-4.6 (30%)
4. **kimi-k2.6** — 24%±2%, $3.16 — Distant third. Good coding agent, weak orchestrator (Arena -1.61%)
5. **minimax-m3** — 20%±4%, $5.57 — Strong multimodal, 1M ctx, weak agent (-3.08% Arena)
6. **mimo-v2.5-pro** — 19%±2%, $1.99 — Best value: quality per dollar
7. **qwen3.7-max** — 18%±1%, $2.12 — Best reasoning (AA 56.6), now positive on Arena (+0.36%)
8. **glm-5.1** — 18%±1%, $7.46 — Overpriced for the score

### LM Arena Agent Leaderboard (July 8, 2026)

Preference-based causal evaluation of agent orchestrator models across **947K+** real-world sessions.
"Net Improvement" is the aggregate causal treatment effect (%); higher = better orchestrator.
Source: https://arena.ai/leaderboard/agent — fetched via firecrawl.

#### Key Signals

| Signal | Measures | What It Tells You |
|---|---|---|
| **Net Improvement** | Aggregate causal treatment effect across all signals | Overall agent quality — best signal for Orchestrator assignment |
| **Confirmed Success** | User confirms task completion | Task-completion reliability |
| **Praise vs Complaint** | Positive/negative feedback ratio | User satisfaction |
| **Steerability** | Model responds well to corrections | Receptiveness to mid-task guidance — key for Oracle role |
| **Bash Recovery** | Recovers from failed commands with fewest steps | Agentic resilience — key for Fixer role |
| **Tool Hallucination** | Calls tools that don't exist | Reliability — lower/hallucination = better for all agents |

#### Signal Leaders (Jul 8)

| Signal | #1 Model | Score |
|---|---|---|
| Confirmed Success | Claude Fable 5 (High) | +16.88% |
| Praise vs Complaint | Claude Fable 5 (High) | +30.94% |
| Steerability | Claude Fable 5 (High) | +12.56% |
| Bash Recovery | GPT 5.5 (xHigh) | +14.54% |
| **Tool Hallucination** | **GLM 5.2 (Max)** ⚡ | **1.24% (lowest — tied)** |

#### Full Leaderboard (32 models)

| Agent Rank | Model | Net Improvement | Confirmed Success | Praise/Complaint | Steerability | Bash Recovery | Tool Hallucination | Sessions |
|---|---|---|---|---|---|---|---|---|
| 1 | Claude Fable 5 (High) | **+14.10%±1.56%** | +16.88% | +30.94% | +12.56% | +8.91% | 1.24% | 16,059 |
| 2 | Claude Opus 4.8 (Thinking) | **+9.76%±1.34%** | +8.28% | +18.04% | +11.77% | +10.03% | 0.70% | 32,490 |
| 3 | GPT 5.5 (xHigh) | **+8.90%±0.91%** | +7.69% | +13.87% | +7.18% | +14.54% | 1.24% | 32,695 |
| 4 | Claude Opus 4.7 (Thinking) | **+8.51%±1.25%** | +6.55% | +13.34% | +9.80% | +11.74% | 1.13% | 33,427 |
| 5 | Claude Opus 4.7 | **+8.22%±1.24%** | +6.02% | +13.96% | +8.97% | +10.97% | 1.19% | 34,054 |
| 6 | **Claude Sonnet 5 (High)** | **+8.16%±1.38%** | +12.25% | +14.50% | +3.58% | +9.35% | 1.11% | 22,779 |
| 7 | GPT 5.5 (High) | **+7.41%±0.75%** | +6.41% | +8.10% | +8.71% | +12.58% | 1.24% | 57,971 |
| 8 | GPT 5.4 (High) | **+6.73%±0.77%** | +6.83% | +6.69% | +8.96% | +9.91% | 1.24% | 58,074 |
| 9 | GPT 5.5 | **+6.66%±0.74%** | +4.79% | +7.23% | +8.84% | +11.21% | 1.24% | 58,633 |
| **10** | **GLM 5.2 (Max)** ⚡ | **+6.54%±1.17%** | **+9.46%** | **+13.74%** | +3.44% | +4.82% | **1.24%** | **29,649** |
| 11 | Claude Opus 4.6 | **+6.49%±1.20%** | +2.32% | +9.17% | +8.67% | +11.02% | 1.24% | 33,169 |
| 12 | Claude Opus 4.8 | **+4.75%±1.55%** | +7.23% | +12.77% | +8.83% | +10.22% | 15.29% | 30,531 |
| 13 | Claude Sonnet 4.6 | **+2.74%±1.11%** | +0.79% | +0.13% | +1.66% | +11.73% | 1.23% | 33,934 |
| 14 | **GLM 5.1** ⚡ | **+1.57%±0.86%** | +1.67% | +0.80% | +0.05% | +4.07% | 1.24% | 47,828 |
| 15 | **Qwen3.7 Max** ⚡ | **+0.36%±2.01%** | +1.43% | +0.52% | +5.20% | +7.91% | 1.02% | 6,271 |
| 16 | **Kimi K2.7 Code** ⚡ | **+0.13%±2.60%** | +7.70% | +0.63% | +6.82% | +0.86% | 1.24% | 4,870 |
| 17 | Gemini 3.1 Pro Preview | **+0.17%±0.70%** | +0.72% | +0.72% | +3.47% | +6.98% | 1.20% | 58,057 |
| 18 | **Qwen3.7 Plus** ⚡ | **+0.43%±1.87%** | +1.87% | +1.63% | +5.20% | +5.90% | 0.63% | 6,395 |
| 19 | **DeepSeek V4 Pro** ⚡ | **-0.83%±1.86%** | +2.34% | +3.13% | +4.61% | +4.94% | 0.99% | 6,680 |
| 20 | Gemini 3.5 Flash (High) | **+0.90%±0.76%** | +0.98% | +3.82% | +0.44% | +0.13% | 1.09% | 45,997 |
| 21 | **Kimi K2.6** ⚡ | **-1.61%±2.91%** | +2.34% | +3.89% | +7.33% | +8.23% | 1.24% | 4,952 |
| 22 | **MiniMax M3** ⚡ | **-3.08%±1.78%** | +7.66% | +9.93% | +5.24% | +6.46% | 0.99% | 6,413 |
| 23 | **MiMo V2.5 Pro** ⚡ | **-3.71%±1.87%** | +6.18% | +10.28% | +5.48% | +2.77% | 0.63% | 6,760 |
| 24 | **DeepSeek V4 Flash** ⚡ | **-4.65%±1.75%** | +9.37% | +10.65% | +7.33% | +4.71% | 0.60% | 6,469 |
| 25 | Gemini 3.5 Flash (Medium) | **-7.24%±1.92%** | +13.44% | +9.32% | +8.13% | +6.20% | 0.87% | 6,134 |
| 26 | Grok 4.3 (High) | **-7.65%±0.79%** | +8.92% | +14.41% | +6.78% | +8.88% | 0.74% | 38,049 |
| 27 | Grok Build 0.1 | **-7.87%±0.81%** | +5.77% | +13.07% | +11.38% | +9.34% | 0.24% | 49,156 |
| 28 | Gemini 3 Flash | **-8.14%±0.79%** | +8.77% | +11.47% | +3.98% | +16.56% | 0.10% | 58,454 |
| 29 | **Minimax M2.7** ⚡ | **-10.18%±2.14%** | +17.12% | +14.49% | +16.42% | +3.74% | 0.89% | 6,604 |
| 30 | Nemotron 3 Ultra | **-11.87%±2.84%** | +11.23% | +7.15% | +20.97% | +18.97% | 1.01% | 8,814 |
| 31 | Gemma 4 31B | **-13.09%±1.48%** | +3.00% | +4.99% | +4.32% | +31.07% | 22.07% | 47,760 |
| 32 | Grok 4.3 | **-15.57%±1.02%** | +11.30% | +16.01% | +8.34% | +43.10% | 0.91% | 57,872 |

⚡ = Available on opencode-go

#### Go Models Ranked on Arena Agent (Jul 8)

| Go Model | Agent Rank | Net Improvement | Key Signal Strength | Verdict |
|---|---|---|---|---|
| **GLM 5.2 (Max)** | 10 | **+6.54%** ↑2.17 | #1 Tool Hallucination (1.24%), #3 Confirmed (+9.46%) | Best Go by far — jumped 49% |
| **GLM 5.1** | 14 | +1.57% ↓1.09 | Confirmed Success +1.67% (weak) | Good mid-tier, aging |
| **Qwen3.7 Max** | 15 | **+0.36%** ↑4.60 | Steerability +5.20% (best Go, matching Fable 5's level) | **Massive recovery** — now usable for agent tasks |
| **Kimi K2.7 Code** | 16 | +0.13% ↑2.84 | Confirmed Success +7.70% (strong) | Recovered from -2.71% to near-zero |
| **DeepSeek V4 Pro** | 19 | -0.83% ↓0.93 | Steerability +4.61% (decent) | Barely negative, still not worth cost |
| **Kimi K2.6** | 21 | -1.61% ↓1.11 | Steerability +7.33% (improved) | Below average |
| **MiniMax M3** | 22 | **-3.08%** ↓0.29 | Confirmed Success +7.66% (good) but Bash Recovery weak | Weak agentic |
| **MiMo V2.5 Pro** | 23 | -3.71% ↓0.92 | Praise/Complaint +10.28% (decent) | Weak agent, fine for bounded fixer tasks |
| **DeepSeek V4 Flash** | **24** | **-4.65%** ↓3.47 | Confirmed Success +9.37% (good) but overall poor | **Big drop** — fine only as cheap speed model |

#### Cross-Benchmark: How Arena Agent Compares to DeepSWE

| Go Model | Arena Agent (Net Improvement) | DeepSWE Pass@1 | Arena Predicts |
|---|---|---|---|---|
| GLM 5.2 (Max) | **+6.54%±1.17%** | **44%±2%** | Best Go orchestrator ✅ Confirmed — gap widened |
| GLM 5.1 | +1.57%±0.86% | 18%±1% | Decent but fading |
| DeepSeek V4 Pro | -0.83%±1.86% | 8%±3% | Weak — consistent |
| Kimi K2.6 | -1.61%±2.91% | 24%±2% | **Misalignment**: strong coding, poor agent |
| DeepSeek V4 Flash | **-4.65%±1.75%** | ~8-12% est | **Worst agent** — fast cheap only |
| Qwen3.7 Max | **+0.36%** ⚡ | 18%±1% | **Now aligned** — big recovery from -4.24% |
| Kimi K2.7 Code | +0.13%±2.60% | **31%±1%** | Recovering — coding focus shows in DeepSWE |

**Key insight:** GLM-5.2 widened its lead. DeepSWE independently confirms 44%, Arena jumped to +6.54%. The gap to the next Go model (kimi-k2.7-code at +0.13% Arena / 31% DeepSWE) is now **50× on agentic tasks**. GLM-5.2 is the only Go model that excels at **both** agentic orchestration and code generation.

### GLM-5.2 Full Benchmark Table (Z.ai Official, Jun 16, 2026)

Source: https://z.ai/blog/glm-5.2 — official vendor benchmarks using standard harnesses.
**IMPORTANT:** These are Z.ai's own reported scores. The DeepSWE run uses the same official mini-swe-agent harness as the DeepSWE leaderboard and all comparison-model scores match the official leaderboard exactly (±0%), so cross-model comparisons are reliable.

| Benchmark | GLM-5.2 | GLM-5.1 | Qwen3.7-Max | MiniMax M3 | DS-V4-Pro | Opus 4.8 | GPT-5.5 | Gemini 3.1 Pro |
|---|---|---|---|---|---|---|---|---|
| **DeepSWE** | **46.2** | 18.0 | 18.0 | 20.0 | 8.0 | 58.0 | 70.0 | 10.0 |
| **SWE-bench Pro** | **62.1** | 58.4 | 60.6 | 59.0 | 55.4 | 69.2 | 58.6 | 54.2 |
| **Terminal-Bench 2.1** | **81.0** | 63.5 | 75.0 | 65.0 | 64.0 | 85.0 | 84.0 | 74.0 |
| **FrontierSWE** | **74.4** | 30.5 | — | — | 29.0 | 75.1 | 72.6 | 39.6 |
| **PostTrainBench** | **34.3** | 20.1 | — | — | — | 37.2 | 28.4 | 21.6 |
| **SWE-Marathon** | **13.0** | 1.0 | — | — | — | 26.0 | 12.0 | 4.0 |
| **ProgramBench** | **63.7** | 50.9 | — | — | 47.8 | 71.9 | 70.8 | 39.5 |
| **NL2Repo** | **48.9** | 42.7 | 47.2 | 42.1 | 35.5 | 69.7 | 50.7 | 33.4 |
| **MCP-Atlas** | **76.8** | 71.8 | 76.4 | 74.2 | 73.6 | 77.8 | 75.3 | 69.2 |
| **Tool-Decathlon** | **48.2** | 40.7 | — | — | 52.8 | 59.9 | 55.6 | 48.8 |
| **HLE** | **40.5** | 31.0 | 41.4 | 37.0 | 37.7 | 49.8* | 41.4* | 45.0 |
| **HLE w/ Tools** | **54.7** | 52.3 | 53.5 | — | 48.2 | 57.9* | 52.2* | 51.4* |
| **AIME 2026** | **99.2** | 95.3 | 97.0 | — | 94.6 | 95.7 | 98.3 | 98.2 |
| **GPQA-Diamond** | **91.2** | 86.2 | 90.0 | 93.0 | 90.1 | 93.6 | 93.6 | 94.3 |

\* = Full set scores
Bold = best among Go-available models
— = Not reported in Z.ai's table

**GLM-5.2 vs Other Go Models — Key Takeaways:**

- **46.2% DeepSWE** — 2× higher than the next best Go model (kimi-k2.6 at 24%). Positions it just below Claude Opus 4.8 (58%) and GPT-5.5 (70%).
- **74.4 FrontierSWE** — Trails Opus 4.8 (75.1) by only 0.7%. Far ahead of GLM-5.1 (30.5). Measures open-ended engineering projects at hours-to-tens-of-hours scale.
- **62.1 SWE-bench Pro** — Beats Qwen3.7-Max (60.6) and MiniMax M3 (59.0). #1 Go model.
- **81.0 Terminal-Bench 2.1** — Beats Qwen3.7-Max (75.0) by 6 points. Second best overall behind GPT-5.5 (84.0).
- **MCP-Atlas 76.8** — Tied with Qwen3.7-Max (76.4) for best Go agentic model. Trails Opus 4.8 (77.8) by only 1 point.
- **99.2 AIME 2026** — Highest of all models including Opus 4.8 (95.7) and GPT-5.5 (98.3). Best math reasoning on Go.

**Caveats:**
- Z.ai ran these benchmarks themselves. The DeepSWE comparison is reliable (same harness, scores match official). Other benchmarks may use different harnesses/configurations across models.
- **Independently verified DeepSWE** (v1.1, Jul 1): 44%±2% vs Z.ai's self-reported 46.2.
- Only 4,300/mo on Go. Not suitable for high-volume agent roles.
- No SWE-rebench score yet.
- Arena Agent score (+6.54%) is from the official leaderboard (Jul 8), not Z.ai.

### Go Model Combined Ranking (All Benchmarks)

| Rank | Model | DeepSWE | SWE-bench Pro | Terminal-Bench | Arena Agent | AA Index | Verdict |
|---|---|---|---|---|---|---|---|
| **1** | **GLM-5.2** | **44%** | **62.1** | **81.0** | **+6.54%** | — | Best coder + best orchestrator on Go — gap widened |
| **NEW** | **Hy3** | **28**† | **57.9**‡ | — | — | — | **NEW Jul 6** — SWE-bench Verified 78% ⚠️ Tencent-reported, not on official SWE-bench leaderboard; OpenRouter only |
| 2 | Kimi K2.7 Code | **31%**† | — | — | +0.13% | — | Rising coding specialist |
| 3 | Qwen3.7-Max | 18% | 60.6 | 75.0 | **+0.36%** | 56.6 | Arena recovered from -4.24% to +0.36% |
| 4 | Kimi K2.6 | 24% | ~50%† | — | -1.61% | ~50 | Solid coding, weak orchestrator |
| 5 | MiMo-V2.5-Pro | 19% | — | — | -3.71% | — | Value fixer, but weak agentic |
| 6 | MiniMax M3 | 20% | — | 65.0 | -3.08% | — | Multimodal specialist |
| 7 | GLM-5.1 | 18% | 58.4 | 63.5 | +1.57% | ~50 | Consistent mid-tier, fading |
| 8 | DeepSeek V4 Flash | ~8-12% | — | — | **-4.65%** | — | Fast cheap — quality declined on Arena |

† = Vendor-reported or estimated. For Hy3, † = Tencent-reported DeepSWE 28 (not on official DeepSWE leaderboard).
‡ = SWE-bench Pro (Tencent-reported; Hy3 not on official SWE-bench leaderboard).

### Non-DeepSWE Benchmarks for Go Models

| Model | AA Index | SWE-Pro | SWE-rebench | AI Coding Daily | Arena Agent | DeepSWE |
|---|---|---|---|---|---|---|---|
| **GLM-5.2** | **N/A** | **62.1%** | **N/A** | **N/A** | **+6.54%** | **44%** |
| qwen3.7-max | **56.6** | 60.6% | N/A | N/A | **+0.36%** | 18% |
| kimi-k2.7-code | N/A | N/A | N/A | N/A | +0.13% | **31%**† |
| kimi-k2.6 | ~50 | ~50% | 46.5% | 14/20 | -1.61% | 24% |
| minimax-m3 | N/A | 59.0%† | 45.6% | 15/20 | -3.08% | 20% |
| mimo-v2.5-pro | N/A | N/A | N/A | 13/20 | -3.71% | 19% |
| glm-5.1 | ~50 | ~56% | 50.7% | 9/20 | +1.57% | 18% |

† = Vendor-reported by MiniMax using Claude Code scaffolding. M3's SWE-rebench score (45.6%) uses the same harness as all models listed.

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

### Go Model Benchmark Ranking (July 2026, all sources)

| Rank | Model | DeepSWE | SWE-Pro | Terminal-Bench | AA Index | Arena Agent | Price (I/O) |
|---|---|---|---|---|---|---|---|
| **1** | **GLM-5.2** | **44**† | **62.1** | **81.0** | **51** | **+6.54%** | **$1.40/$4.40** |
| **NEW** | **Hy3** | **28**† | **57.9**‡ | — | — | — | **$0.14/$0.58 (OR)** — NEW Jul 6: SWE-bench Verified 78% ⚠️ Tencent-reported, not on official SWE-bench leaderboard; OpenRouter only |
| 2 | Kimi K2.7 Code | **31**‡ | — | — | — | +0.13% | $0.95/$4.00 |
| 3 | Kimi K2.6 | 24 | ~50 | — | ~50 | -1.61% | $0.95/$4.00 |
| 4 | MiniMax M3 | 20 | 59 | — | 44 | -3.08% | $0.30/$1.20* |
| 5 | MiMo-V2.5-Pro | 19 | — | — | — | -3.71% | $1.74/$3.48 |
| 6 | Qwen3.7 Max | 18 | 60.6 | 75 | **56.6** | **+0.36%** | $2.50/$7.50 |
| 7 | GLM-5.1 | 18 | 58.4 | 63.5 | 40 | +1.57% | $1.40/$4.40 |

† = DeepSWE v1.1 independently verified (Jul 1) for GLM-5.2; for Hy3, † = Tencent-reported DeepSWE 28 (not on official DeepSWE leaderboard).
‡ = DeepSWE v1.1 score (same leaderboard version as GLM-5.2, kimi-k2.7-code was not on v1). For Hy3, ‡ = SWE-bench Pro (Tencent-reported; not on official SWE-bench leaderboard).
\* = Zen pricing; Go pricing is $0.30/$1.20.
AA Index = Artificial Analysis Intelligence Index v4.1 (independent composite).

### Go Model Benchmark Ranking (by independent data)

Based on independently verified benchmarks available:

1. **GLM-5.2** — DeepSWE **44%** (indep.), SWE-Pro 62.1%, Terminal-Bench 2.1 81.0, FrontierSWE 74.4, Arena Agent **+6.54%**, AIME 99.2. **#1 Go by every metric — gap to #2 widened.** Only 4,300/mo limits.
2. **NEW: Hy3** — DeepSWE **28** (Tencent self-reported, not on official leaderboard), SWE-bench Verified **78%** ⚠️ (Tencent-reported, not on official SWE-bench leaderboard), SWE-bench Pro 57.9, GPQA 90.4, HLE 53.2. AA Intelligence Index **34** (#23/94 — below all Go models). Apache 2.0, 295B MoE/21B active. **OpenRouter only ($0.14/$0.58) — NOT on OpenCode Go or Zen.** Blind expert eval 2.67/4 beats GLM-5.1 (2.51/4). Comparable to GLM-5.2 at 2.6× smaller.
3. **Kimi K2.7 Code** — DeepSWE **31%** (v1.1). Rising coding specialist. Beats claude-sonnet-4.6 (30%). Arena recovered to +0.13%. 9,250/mo.
4. **Qwen3.7 Max** — AA Index 56.6, SWE-Pro 60.6%, Terminal-Bench 2.1 75.0, AIME 97.0. Arena **massive recovery** from -4.24% to +0.36%. Best reasoning model.
5. **Kimi K2.6** — DeepSWE 24%, SWE-rebench 46.5%. Second best coding score, but weak real agent (Arena -1.61%).
6. **MiMo-V2.5-Pro** — DeepSWE 19%, Arena Agent -3.71%. Value fixer (16,300/mo, $1.99 avg cost). Agentic quality declining.
7. **MiniMax M3** — DeepSWE 20%, SWE-Pro 59.0%†, Terminal-Bench 65.0, Arena -3.08%. Multimodal specialist.
8. **GLM-5.1** — DeepSWE 18%, SWE-rebench 50.7%, Arena +1.57%. Consistent mid-tier, overpriced on Go.
9. **DeepSeek V4 Pro** — DeepSWE 8%, Arena -0.83%. Slow. Not recommended.
10. **DeepSeek V4 Flash** — Est ~8-12% DeepSWE, Arena **-4.65%**. 158K/mo, fastest, cheapest. Quality continues to decline on agentic tasks.

## OpenCode Go Plan (July 9, 2026 — unchanged since Jun 17)

$10/mo ($5 first month). Limits in request count per model.
**NEW models:** GLM-5.2 (4,300/mo), Qwen3.7 Plus (21,600/mo).
**REMOVED:** Qwen3.5 Plus, GLM-5, Kimi K2.5, MiniMax M2.5.
**Active models on Go:** 13 models (listed below).

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

## OpenRouter Pricing (Live via MCP)

OpenRouter PAYG pricing for key models. Prices per 1M tokens (USD). Live data via `openrouter_models-list` or `openrouter_model-endpoints`.
Often cheaper than Zen for the same model. Includes Artificial Analysis benchmarks.

| Model | OpenRouter Prompt | OpenRouter Completion | OpenRouter Cached | AA Intel | AA Coding | AA Agentic | Cheapest Provider |
|---|---|---|---|---|---|---|---|
| GLM-5.2 | $0.56 | $1.76 | $0.104 | 51.1 | 68.8 | 43.1 | DeepInfra |
| GLM-5.1 | $0.966 | $3.036 | $0.179 | 40.2 | 55.8 | 29.9 | Z.AI |
| Hy3 | $0.14 | $0.58 | $0.035 | — | — | — | DeepInfra |
| DeepSeek V4 Flash | $0.09 | $0.18 | $0.018 | 40.3 | 56.2 | 31.1 | Wafer |
| DeepSeek V4 Pro | $0.44 | $0.87 | $0.004 | 44.3 | 59.4 | 36.4 | DeepInfra |
| MiMo-V2.5 | $0.105 | $0.28 | — | — | — | — | DeepInfra |
| MiMo-V2.5-Pro | $0.435 | $0.87 | $0.0036 | 42.2 | 60.2 | 29.1 | DeepInfra |
| Qwen3.7 Max | $1.25 | $3.75 | $0.25 | 46.0 | 66.0 | 30.6 | DeepInfra |
| Qwen3.7 Plus | $0.32 | $1.28 | $0.064 | 39.0 | 55.9 | 20.8 | DeepInfra |
| Kimi K2.6 | $0.66 | $3.41 | $0.14 | 42.8 | 56.0 | 30.3 | DeepInfra |
| Kimi K2.7 Code | $0.74 | $3.50 | $0.15 | 41.9 | 60.8 | 29.6 | DeepInfra |
| MiniMax M3 | $0.30 | $1.20 | $0.06 | 44.4 | 58.6 | 35.4 | DeepInfra |
| MiniMax M2.7 | $0.30 | $1.20 | $0.06 | 38.1 | 52.6 | 25.6 | DeepInfra |
| GPT-5.4 | $2.50 | $15.00 | $0.25 | 51.4 | 71.1 | 41.1 | OpenAI |
| GPT-5.4 Mini | $0.75 | $4.50 | $0.075 | 40.0 | 56.1 | 30.2 | OpenAI |
| GPT-5.5 | $5.00 | $30.00 | $0.50 | 54.8 | 74.9 | 44.9 | OpenAI |
| Claude Opus 4.8 | $5.00 | $25.00 | $0.50 | 55.7 | 74.3 | 47.2 | Anthropic |
| Claude Opus 4.7 | $5.00 | $25.00 | $0.50 | 53.5 | 73.6 | 44.4 | Anthropic |
| Claude Sonnet 4.6 | $3.00 | $15.00 | $0.30 | 47.2 | 63.0 | 40.8 | Anthropic |
| Gemini 3.5 Flash | $1.50 | $9.00 | $0.15 | 50.2 | 70.1 | 37.4 | Google |
| Gemini 3.1 Pro | $2.00 | $12.00 | $0.20 | 46.5 | 68.8 | 21.4 | Google |
| Nemotron 3 Ultra | Free | Free | — | 37.8 | 49.3 | 27.4 | NVIDIA |

**Key takeaways:**
- **OpenRouter is cheaper than Zen for Go-available models**: GLM-5.2 cheapest via DeepInfra at $0.56/$1.76 (vs $1.40/$4.40 Zen — 60% cheaper!) or Z.ai direct at $0.90/$3.08. DeepSeek V4 Flash ($0.09/$0.18 vs $0.14/$0.28 Zen).
- **AA benchmarks are embedded in model metadata** — no separate scraping needed
- **Provider choice matters**: GLM-5.2 ranges from $0.56/$1.76 (DeepInfra) to $1.40/$4.40 (Z.AI, Fireworks, etc.) — 60% price difference
- **OpenRouter has models not on Go or Zen**: Some models available on neither platform (e.g., KAT-Coder-Pro, Ring-2.6)

Source: `openrouter_models-list` + `openrouter_benchmarks` (live MCP data).

## Design Arena ELO (Live, Jul 5 2026 — verified Jul 9, unchanged)

From OpenRouter MCP `openrouter_models-list` — Design Arena ELO scores for Go-available models.
Higher ELO = better. Categories: `models` arena (code gen, UI, 3D, gamedev, dataviz, website) and `agents` arena (fullstack, webapps, mobileapps, slides).

| Model | Website ELO | CodeCategories ELO | UI Component ELO | 3D ELO | Fullstack (agent) ELO | WebApps (agent) ELO |
|---|---|---|---|---|---|---|
| **GLM-5.2** | **1356 (#1)** | **1360 (#1)** | 1339 (#5) | **1373 (#1)** | 1293 (#3) | 1284 (#3) |
| GLM-5.1 | 1317 (#9) | 1331 (#5) | 1339 (#4) | 1341 (#5) | 1231 (#8) | 1245 (#10) |
| Kimi K2.6 | 1318 (#7) | 1327 (#6) | 1320 (#10) | 1355 (#3) | 1220 (#11) | 1260 (#7) |
| Kimi K2.7 Code | 1318 (#8) | 1306 (#13) | 1302 (#14) | 1315 (#13) | 1233 (#7) | 1248 (#8) |
| MiMo-V2.5-Pro | 1309 (#11) | 1319 (#10) | 1299 (#15) | 1322 (#10) | — | — |
| MiMo-V2.5 | 1304 (#12) | 1303 (#15) | 1311 (#13) | 1298 (#19) | — | — |
| MiniMax M3 | 1304 (#13) | 1306 (#14) | 1294 (#17) | 1305 (#17) | — | — |
| Qwen3.7 Max | 1302 (#14) | 1311 (#11) | 1331 (#6) | 1325 (#8) | 1223 (#9) | 1269 (#4) |

**Key takeaways:**
- **GLM-5.2 dominates Design Arena** — #1 on website, codecategories, and 3D. Best designer model on Go.
- **Kimi K2.6** is strong on agent slides/htmlslides (ELO 1248, rank 2) — good for presentation-heavy design work.
- **Qwen3.7 Max** has the best UI component ELO among Go models (1331, #6 overall).
- For pure UI/UX design tasks, GLM-5.2 > Kimi K2.6 > Qwen3.7 Max.

## OpenCode Zen Pricing (July 9, 2026)

PAYG per 1M tokens (USD). Use when model isn't on Go or you exceed Go limits.
**NEW on Zen (since Jun 17):** Claude Fable 5 ($10/$50), **Claude Sonnet 5** ($2/$10), **Grok 4.5** ($2/$6), **GPT 5.4 Nano** ($0.20/$1.25), GPT 5.3 Codex/Codex Spark.
**BACK on Zen:** MiniMax M3 ($0.30/$1.20) — was "removed" in previous REFERENCE.
**REMOVED from Zen (since Jun 17):** MiMo-V2.5 (paid), MiMo-V2.5-Pro, Claude Sonnet 4 (deprecated Jun 15).
**Go-only models (no Zen fallback):** GLM-5.2, MiMo-V2.5 (paid removed from Zen), MiMo-V2.5-Pro (paid removed from Zen). Note: MiniMax M3 is now on Zen again via OpenAI-compatible endpoint.

| Model | Input | Output | Cached Read |
|---|---|---|---|
| DeepSeek V4 Flash Free | Free | Free | Free |
| MiMo-V2.5 Free | Free | Free | Free |
| North Mini Code Free | Free | Free | Free |
| Nemotron 3 Ultra Free | Free | Free | Free |
| Big Pickle | Free | Free | Free |
| MiniMax M3 | $0.30 | $1.20 | $0.06 |
| MiniMax M2.7 | $0.30 | $1.20 | $0.06 |
| DeepSeek V4 Flash | $0.14 | $0.28 | $0.028 |
| MiMo-V2.5 | $0.14 | $0.28 | $0.0028 |
| MiMo-V2.5-Pro | $1.74 | $3.48 | $0.0145 |
| MiniMax M2.5 | $0.30 | $1.20 | $0.06 |
| Qwen3.5 Plus | $0.20 | $1.20 | $0.02 |
| Qwen3.6 Plus | $0.50 | $3.00 | $0.05 |
| Qwen3.7 Plus | $0.40 | $1.60 | $0.04 |
| Qwen3.7 Max | $2.50 | $7.50 | $0.50 |
| GLM-5.2 | $1.40 | $4.40 | $0.26 |
| GLM-5.1 | $1.40 | $4.40 | $0.26 |
| GLM-5 | $1.00 | $3.20 | $0.20 |
| Kimi K2.7 Code | $0.95 | $4.00 | $0.19 |
| Kimi K2.6 | $0.95 | $4.00 | $0.16 |
| Kimi K2.5 | $0.60 | $3.00 | $0.10 |
| DeepSeek V4 Pro | $1.74 | $3.48 | $0.145 |
| Grok 4.5 (≤200K) | $2.00 | $6.00 | $0.50 |
| Grok 4.5 (>200K) | $4.00 | $12.00 | $1.00 |
| Grok Build 0.1 | $1.00 | $2.00 | $0.20 |
| Claude Fable 5 | $10.00 | $50.00 | $1.00 |
| Claude Opus 4.8 | $5.00 | $25.00 | $0.50 |
| Claude Opus 4.7 | $5.00 | $25.00 | $0.50 |
| Claude Opus 4.6 | $5.00 | $25.00 | $0.50 |
| Claude Opus 4.5 | $5.00 | $25.00 | $0.50 |
| Claude Sonnet 5 | $2.00 | $10.00 | $0.20 |
| Claude Sonnet 4.6 | $3.00 | $15.00 | $0.30 |
| Claude Haiku 4.5 | $1.00 | $5.00 | $0.10 |
| GPT-5.5 (≤272K) | $5.00 | $30.00 | $0.50 |
| GPT-5.5 (>272K) | $10.00 | $45.00 | $1.00 |
| GPT-5.5 Pro | $30.00 | $180.00 | $30.00 |
| GPT-5.4 (≤272K) | $2.50 | $15.00 | $0.25 |
| GPT-5.4 (>272K) | $5.00 | $22.50 | $0.50 |
| GPT-5.4 Pro | $30.00 | $180.00 | $30.00 |
| GPT-5.4 Mini | $0.75 | $4.50 | $0.075 |
| GPT-5.4 Nano | $0.20 | $1.25 | $0.02 |
| GPT 5.3 Codex Spark | $1.75 | $14.00 | $0.175 |
| Gemini 3.5 Flash | $1.50 | $9.00 | $0.15 |
| Gemini 3.1 Pro (≤200K) | $2.00 | $12.00 | $0.20 |
| Gemini 3.1 Pro (>200K) | $4.00 | $18.00 | $0.40 |
| Gemini 3 Flash | $0.50 | $3.00 | $0.05 |

## Model to Provider Mapping

| Model | Go | Zen | OpenRouter | Go ID | Zen ID | OpenRouter ID |
|---|---|---|---|---|---|---|
| **glm-5.2** | ✅ | ✅ | ✅ | opencode-go/glm-5.2 | opencode/glm-5-2 | z-ai/glm-5.2 |
| glm-5.1 | ✅ | ✅ | ✅ | opencode-go/glm-5.1 | opencode/glm-5.1 | z-ai/glm-5.1 |
| glm-5 | ❌ | ✅⚠️ | ✅ | — (deprecated) | opencode/glm-5 (deprecated May 14) | z-ai/glm-5 |
| deepseek-v4-flash | ✅ | ✅ | ✅ | opencode-go/deepseek-v4-flash | opencode/deepseek-v4-flash | deepseek/deepseek-v4-flash |
| deepseek-v4-pro | ✅ | ✅ | ✅ | opencode-go/deepseek-v4-pro | opencode/deepseek-v4-pro | deepseek/deepseek-v4-pro |
| kimi-k2.7-code | ✅ | ✅ | ✅ | opencode-go/kimi-k2.7-code | opencode/kimi-k2.7-code | moonshotai/kimi-k2.7-code |
| kimi-k2.6 | ✅ | ✅ | ✅ | opencode-go/kimi-k2.6 | opencode/kimi-k2.6 | moonshotai/kimi-k2.6 |
| mimo-v2.5 | ✅ | ✅ | ✅ | opencode-go/mimo-v2.5 | opencode/mimo-v2.5 | xiaomi/mimo-v2.5 |
| mimo-v2.5-pro | ✅ | ✅ | ✅ | opencode-go/mimo-v2.5-pro | opencode/mimo-v2.5-pro | xiaomi/mimo-v2.5-pro |
| minimax-m2.5 | ✅ | ✅ | ✅ | opencode-go/minimax-m2.5 | opencode/minimax-m2.5 | minimax/minimax-m2.5 |
| minimax-m2.7 | ✅ | ✅ | ✅ | opencode-go/minimax-m2.7 | opencode/minimax-m2.7 | minimax/minimax-m2.7 |
| minimax-m3 | ✅ | ✅ | ✅ | opencode-go/minimax-m3 | opencode/minimax-m3 | minimax/minimax-m3 |
| qwen3.7-max | ✅ | ✅ | ✅ | opencode-go/qwen3.7-max | opencode/qwen3.7-max | qwen/qwen3.7-max |
| qwen3.7-plus | ✅ | ✅ | ✅ | opencode-go/qwen3.7-plus | opencode/qwen3.7-plus | qwen/qwen3.7-plus |
| qwen3.6-plus | ✅ | ✅ | ✅ | opencode-go/qwen3.6-plus | opencode/qwen3.6-plus | qwen/qwen3.6-plus |
| qwen3.5-plus | ❌ | ✅ | ✅ | — | opencode/qwen3.5-plus | qwen/qwen3.5-397b-a17b |
| claude-opus-4.8 | ❌ | ✅ | ✅ | — | opencode/claude-opus-4-8 | anthropic/claude-opus-4.8 |
| claude-opus-4.7 | ❌ | ✅ | ✅ | — | opencode/claude-opus-4-7 | anthropic/claude-opus-4.7 |
| claude-sonnet-4.6 | ❌ | ✅ | ✅ | — | opencode/claude-sonnet-4-6 | anthropic/claude-sonnet-4.6 |
| gpt-5.5 | ❌ | ✅ | ✅ | — | opencode/gpt-5.5 | openai/gpt-5.5 |
| gpt-5.4 | ❌ | ✅ | ✅ | — | opencode/gpt-5.4 | openai/gpt-5.4 |
| gemini-3.1-pro | ❌ | ✅ | ✅ | — | opencode/gemini-3.1-pro | google/gemini-3.1-pro-preview |
| claude-sonnet-5 | ❌ | ✅ | ✅ | — | opencode/claude-sonnet-5 | anthropic/claude-sonnet-5 |
| grok-4.5 | ❌ | ✅ | ✅ | — | opencode/grok-4-5 | spacexai/grok-4.5 |
| gpt-5.4-nano | ❌ | ✅ | ✅ | — | opencode/gpt-5-4-nano | openai/gpt-5.4-nano |
| gemini-3.5-flash | ❌ | ✅ | ✅ | — | opencode/gemini-3.5-flash | google/gemini-3.5-flash |
| nemotron-3-ultra | ❌ | ✅ (free) | ✅ (free) | — | opencode/nemotron-3-ultra | nvidia/nemotron-3-ultra-550b-a55b |

**OpenRouter availability note:** OpenRouter offers virtually every model from every provider, including models absent from both Go and Zen. The OpenRouter MCP tools (`openrouter_models-list`, `openrouter_model-get`) provide live availability and pricing.

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

### New Models Available on Go (June 2026)

| Model | Req/mo (live) | Pricing I/O | Key Strength | Caveat |
|---|---|---|---|---|
| **GLM-5.2** | 4,300 | $1.40/$4.40 | Arena Agent **+6.54%** (best Go), DeepSWE **44%** indep., Design Arena #1 | Only 4,300/mo limits |
| **Qwen3.7 Max** | 4,770 | $2.50/$7.50 | AA Index 56.6, Arena **recovered to +0.36%**, SWE-Pro 60.6% | DeepSWE only 18% for agentic coding |
| **MiniMax M3** | 16,000 | $0.30/$1.20 | DeepSWE 20%, SWE-rebench 45.6%, multimodal, 1M ctx | Back on Zen. Very slow on DeepSWE (57m) |
| **Kimi K2.7 Code** | 9,250 | $0.95/$4.00 | DeepSWE **31%** (v1.1!), Arena **recovered to +0.13%** | Formerly -2.71% on Arena; now improving |

### Models Removed / Deprecated

- **Qwen3.5 Plus** — dropped from Go model list (still on Zen)
- **GLM-5** — deprecated on Zen (May 14, 2026); removed from Go model list
- **Kimi K2.5** — removed from Go model list (still on Zen); **to be deprecated Aug 5, 2026**
- **MiniMax M2.5** — removed from Go model list (still on Zen); also known broken API; **to be deprecated Aug 5, 2026**
- **Claude Opus 4.1** — to be deprecated Aug 5, 2026
- **GPT 5.2 Codex** — to be deprecated Jul 23, 2026
- **GPT 5.1 Codex** variants — to be deprecated Jul 23, 2026
- **Grok 4.5** — NEW on Zen ($2/$6)
- **Claude Sonnet 5** — NEW on Zen ($2/$10)
- **MiniMax M3** — BACK on Zen ($0.30/$1.20 via OpenAI-compatible endpoint)
- **Kimi K2.7 Code** — now on Zen ($0.95/$4.00)
- **MiMo-V2.5 (paid)** — removed from Zen pricing (free tier still on Zen)
- **MiMo-V2.5-Pro** — removed from Zen pricing
- **Claude Sonnet 4** — deprecated (Jun 15, 2026)

### Major Limit / Price Changes

- **GLM-5.2** — new model on Go at 880/5h, 4,300/mo. Arena Agent improved from +4.37% → +6.54%
- **MiMo-V2.5** — limits INCREASED 14× (2,150→30,100/5h, 10,900→150,400/mo). Arena Agent dropped from -1.18% → -4.65%
- **MiMo-V2.5-Pro** — limits increased 2.5× (1,290→3,250/5h, 6,450→16,300/mo). Arena dropped from -2.79% → -3.71%
- **MiniMax M3** — limits increased 2.3× (1,400→3,200/5h, 7,000→16,000/mo); BACK on Zen pricing
- **Qwen3.7 Max** — added at 950/5h, 4,770/mo. Arena massive recovery: -4.24% → +0.36%
- **Qwen3.7 Plus** — limits increased 32% (3,300→4,300/5h, 16,300→21,600/mo). Added to Zen pricing at $0.40/$1.60.
- **Kimi K2.7 Code** — limits confirmed at 1,350/5h, 9,250/mo. Arena recovery: -2.71% → +0.13%

### External Benchmarks & Reviews (June 2026)

- **LM Arena Agent Leaderboard** (arena.ai, **Jul 8**) — **947K+** real-world agent sessions, **32 models**. Go models: GLM-5.2 (Max) **+6.54%** (↑2.17pp), GLM-5.1 +1.57%, **Qwen3.7 Max +0.36%** (↑4.60pp, massive recovery), Kimi K2.7 Code +0.13% (↑2.84pp), Kimi K2.6 -1.61%, MiniMax M3 -3.08%, MiMo V2.5 Pro -3.71%, DeepSeek V4 Flash **-4.65%** (↓3.47pp, big drop).
- **GLM-5.2 Official Benchmarks** (z.ai/blog/glm-5.2, Jun 16) — Full benchmark table with Go-model comparisons. DeepSWE: **46.2%** (indep. verified 44%±2%), SWE-bench Pro: 62.1%, Terminal-Bench 2.1: 81.0, FrontierSWE: 74.4, MCP-Atlas: 76.8.
- **DeepSWE v1.1** (datacurve.ai, **Jul 1**) — Updated to 10 models. GLM-5.2 at **44%±2%** (#1 Go). kimi-k2.7-code at **31%±1%**. claude-sonnet-5 new at 54%±4%.
- **Artificial Analysis Intelligence Index v4.0** — Independent composite of 10 evaluations. Claude Opus 4.8 = 61.4 (top). Qwen3.7 Max = 56.6 (highest Chinese model). Source: artificialanalysis.ai
- **DeepSWE v1** (datacurve.ai, Jun 11) — 113 contamination-free tasks. 17/20 models shown. GPT-5.5 leads at 70%. Go models: kimi-k2.6 24%, minimax-m3 20%, mimo-v2.5-pro 19%, qwen3.7-max 18%, glm-5.1 18%.
- **MiniMax M3 independent DeepSWE** (entrpi.github.io, Jun 2) — 13.3% pass@1 strict (15/113). Official leaderboard now shows 20%±4%. Median 80k output tokens, 325 steps, $7.48/task.
- **AI Coding Daily** (aicodingdaily.com, Jun 2) — 14 models on 4 Laravel/React projects. MiniMax M3 scores 15/20. Very slow (5:34 avg).
- **Kilo.ai Live Leaderboard** (kilo.ai/leaderboard) — Real token usage from 3M+ developers. MiniMax M3 at 47.6% completion rate, $10.35/attempt.
- **SWE-rebench** (swe-rebench.com, fetched Jun 13) — 110 problems, tool-use agentic eval. Go model ranking: GLM-5.1 50.7% > Kimi K2.6 46.5% > MiniMax M3 45.6%。
- **Build Fast with AI June 2026 Leaderboard** — 10-model comparison. Rates Qwen3.7 Max as "rational alternative to Opus 4.8 at 1/6 price."

### Fresh Data Delta (Jul 13 2026 — this session)

| Finding | Previous (Jul 10) | Live (Jul 13) |
|---|---|---|
| **Tencent Hy3** | Not in REFERENCE | **ADDED** — Released Jul 6, SWE-bench Verified 78% (Tencent-reported, not on official leaderboard), DeepSWE 28 (self-reported), AA Intel Index 34 (#23/94). Apache 2.0, 295B MoE/21B active, 256K ctx. NOT on OpenCode Go/Zen. OpenRouter $0.14/$0.58. Structured output errors 7-11%. |
| **oh-my-opencode-slim v2.2.0** | v2.1.1 | **Released Jul 13** — image_routing, cmux multiplexer, verification-planning skill, permission schema restored |
| **User presets** | Single "opencode-best-value-v8" | **Two presets: "quality" (GLM-5.2 + kimi-k2.7-code fixer) and "value" (mimo-v2.5 + deepseek-v4-flash)** — no Claude/OpenAI/Gemini, affordable models only; Hy3 is OpenRouter-only and not the fixer |
| **Council lineup** | 7 councillors (incl Claude/GPT/Gemini/Grok) | **6 affordable councillors** — qwen3.7-max, kimi-k2.7-code, Hy3, GLM-5.2, minimax-m3, mimo-v2.5-pro |

### Fresh Data Delta (Jul 10 2026 — this session)

| Finding | Previous (Jul 9) | Live (Jul 10) |
|---|---|---|
| **GPT-5.6** | Not released | **LAUNCHED Jul 9** — 3 tiers: Sol/Terra/Luna. DeepSWE SOTA 72.7%. On OpenRouter, NOT on Zen yet. |
| **DeepSWE v1.1** | 10 models (Jul 1) | **Now 11+** — GPT-5.6 Sol at 72.7%, Terra at 69.6%, Luna at 67.2% added |
| **Arena Agent** | Jul 8: 947K sessions, 32 models | **Unchanged** — GPT-5.6 not yet on Arena (too new) |
| **Go plan** | 13 models, same limits | **Unchanged** — confirmed via opencode.ai/docs/go/ |
| **GLM-5.2 OpenRouter price** | $0.56/$1.76 (DeepInfra) | **$0.42/$1.32** ↓ 25% (live catalog — cheapest now) |
| **Council preset** | v8: 3 negative-Arena councillors | **v10: GPT-5.6 Sol replaces GPT-5.5** — new DeepSWE SOTA |

## GPT-5.6 (Released July 9, 2026)

OpenAI's new flagship family. Three tiers: **Sol** (flagship), **Terra** (balanced), **Luna** (budget).
All on OpenRouter (`openai/gpt-5.6-sol`, `openai/gpt-5.6-terra`, `openai/gpt-5.6-luna`). NOT on Zen yet.

### Pricing & Benchmarks

| Tier | Price (I/O) | DeepSWE v1.1 | AA Coding | AA Agentic | AA Intel | Context |
|---|---|---|---|---|---|---|
| **Sol** | $5/$30 | **72.7%** (new SOTA) | **80** (new SOTA) | **54** (highest) | **58.9** | 1.05M |
| **Terra** | $2.50/$15 | 69.6% | 77.4 | 47.4 | 55.0 | 1.05M |
| **Luna** | $1/$6 | 67.2% | 74.6 | 45.6 | 51.2 | 1.05M |
| GPT-5.5 (prev) | $5/$30 | 67% | 76.4 | 44.9 | 54.8 | 1.05M |
| Claude Fable 5 | $10/$50 | 69.7% | 77.2 | — | 59.9 | — |

### Key Takeaways

- **GPT-5.6 Sol = new DeepSWE SOTA at 72.7%** — beats Claude Fable 5 (69.7%) and GPT-5.5 (67%) at same price as GPT-5.5.
- **Luna matches GPT-5.5 quality at 1/5 the price** ($1/$6 vs $5/$30). DeepSWE 67.2% vs 67%, AA Agentic 45.6 vs 44.9.
- **AA Coding Agent Index: Sol leads at 80** — 2.8 points above Fable 5, using less than half the output tokens.
- **Agents' Last Exam: Sol scores 52.7%** — beats Fable 5 (40.5%) by 13.1 points.
- All tiers support `reasoning_effort`: max, xhigh, high, medium, low, none.
- Pro variants (Sol Pro, Terra Pro, Luna Pro) use `reasoning.mode=pro` for higher quality on complex tasks.
- `ultra` mode coordinates 4 agents in parallel for even stronger results (Pro/Enterprise only).
- Introduces **Programmatic Tool Calling** — writes/runs lightweight programs in-memory to coordinate tools.
- Introduces **cache-write pricing** at 1.25x input rate (first OpenAI models to do this).

### Council Preset v11 (Jul 10, 2026)

Grok 4.5 replaces deepseek-v4-pro in delta slot. DeepSeek V4 Pro had DeepSWE 8% (abysmal) and negative Arena (-0.83%) — clear weakest slot. Grok 4.5 adds SpaceXAI as 8th unique provider with AA Intelligence Index 54 (4th overall, behind only Fable 5, GPT-5.5, Opus 4.8).

| Slot | Model | Provider | DeepSWE | AA Intel | AA Agentic | Price (I/O) |
|---|---|---|---|---|---|---|
| alpha | claude-sonnet-5 [high] | Anthropic | 54% | 53.4 | 46.7 | $2/$10 |
| beta | qwen3.7-max [high] | Alibaba | 18% | 46.0 | 30.6 | $2.50/$7.50 |
| gamma | kimi-k2.7-code [high] | Moonshot | 31% | 41.9 | 29.6 | $0.95/$4.00 |
| delta | **grok-4.5 [high]** | SpaceXAI | — | **54** | — | $2/$6 |
| epsilon | gpt-5.6-sol [max] | OpenAI | **72.7%** | **58.9** | **54** | $5/$30 |
| zeta | glm-5.2 [max] (OpenRouter) | Z.ai | 44% | 51.1 | 43.1 | $0.42/$1.32 |
| eta | gemini-3.5-flash [high] | Google | 37% | 50.2 | 37.4 | $1.50/$9.00 |

**Changes from v10:** delta upgraded from deepseek-v4-pro (DeepSWE 8%, Arena -0.83%) → grok-4.5 (AA Intel 54, 8th unique provider). DeepSeek was the weakest slot by every metric; Grok 4.5 is a pure intelligence upgrade and adds provider diversity.

**Risk note:** Grok 4.3 (High) scored -7.65% and Grok 4.3 scored -15.57% on Arena Agent — the worst on the entire board. Grok 4.5 hasn't been Arena-tested yet. The high AA Intelligence Index (54) suggests improved reasoning, but the Grok family's agent track record is a known risk. Monitor when Arena Agent data becomes available.

### Council Preset v9 (Jul 10, 2026)

Replaced 3 negative-Arena councillors with better+cheaper alternatives. Maximized provider diversity (7 different providers).

**Removed (negative Arena Agent scores):**
- kimi-k2.6 (Arena -1.61%) → replaced by claude-sonnet-5
- mimo-v2.5-pro (Arena -3.71%) → replaced by kimi-k2.7-code (moved from gamma)
- minimax-m3 (Arena -3.08%) → replaced by gemini-3.5-flash

**New 7-councillor lineup:**

| Slot | Model | Provider | Arena Agent | DeepSWE | Price (I/O) |
|---|---|---|---|---|---|
| alpha | **claude-sonnet-5** [high] | Anthropic | **+8.16%** | **54%** | $2/$10 |
| beta | qwen3.7-max [high] | Alibaba | +0.36% | 18% | $2.50/$7.50 |
| gamma | kimi-k2.7-code [high] | Moonshot | +0.13% | 31% | $0.95/$4.00 |
| delta | **deepseek-v4-pro** [high] | DeepSeek | -0.83% | 8% | $1.74/$3.48 |
| epsilon | gpt-5.5 [xhigh] | OpenAI | **+8.90%** | **70%** | $5/$30 |
| zeta | glm-5.2 [max] (OpenRouter) | Z.ai | **+6.54%** | **44%** | $0.42/$1.32 |
| eta | **gemini-3.5-flash** [high] | Google | +0.90% | 37% | $1.50/$9.00 |

**Sum of DeepSWE scores: 265 → 285.7** (GPT-5.6 Sol adds +5.7pp over GPT-5.5)

Key additions:
- **GPT-5.6 Sol** (NEW, launched Jul 9) — DeepSWE 72.7% (new SOTA), AA Agentic 54 (highest of any model). $5/$30 on OpenRouter.
- **Claude Sonnet 5** (Zen $2/$10) — DeepSWE 54%, Arena +8.16%, AA Agentic 46.7 (highest). Near-Opus quality at 1/5 price.
- **Gemini 3.5 Flash** (Zen $1.50/$9) — DeepSWE 37%, Arena +0.90%. Adds Google as 7th provider.
- **DeepSeek V4 Pro** (Go $1.74/$3.48) — AA Agentic 36.4 (strong). Adds DeepSeek as diverse provider.
- **GLM-5.2 on OpenRouter** dropped to $0.42/$1.32 (67% cheaper than Go's $1.40/$4.40).

### Fresh Data Delta (Jul 9 2026 — this session)

| Finding | Previous (Jul 5) | Live (Jul 9) |
|---|---|---|
| **DeepSWE v1.1** | 8 frontier models (Jun 14) | **10 models** (Jul 1) — GLM-5.2 at **44%±2%** (vs 46% self-reported) |
| **Arena Agent** | Jun 15: 786K sessions | **Jul 8: 947K sessions, 32 models** — all scores updated |
| **GLM-5.2 Arena** | +4.37% | **+6.54%** ↑ +2.17pp (49% improvement) |
| **Qwen3.7 Max Arena** | -4.24% | **+0.36%** ↑ +4.60pp (massive recovery) |
| **DS-V4-Flash Arena** | -1.18% | **-4.65%** ↓ (big drop) |
| **Zen: MiniMax M3** | Removed from Zen | **BACK on Zen** ($0.30/$1.20) |
| **Zen: Claude Sonnet 5** | Not listed | **NEW** ($2/$10) |
| **Zen: Grok 4.5** | Not listed | **NEW** ($2/$6) |
| **Zen: Kimi K2.7 Code** | Go-only | **Now on Zen** ($0.95/$4.00) |
| **Zen: GPT 5.4 Nano** | Not listed | **NEW** ($0.20/$1.25) |
| **OpenRouter GLM-5.2** | $0.56/$1.76 (DeepInfra cheapest) | **$0.90/$3.08** (Z.ai direct) — price diff by provider confirmed |
| **Go model list** | 13 models | **Still 13 models**, limits unchanged |
| **Preset update** | v7 active | **v8 active** — Fixer upgraded to kimi-k2.7-code |

#### Previous Delta (Jul 5 vs Jun 17, preserved for reference)

| Finding | Previous (Jun 17) | Live (Jul 5) |
|---|---|---|
| **GLM-5.2 OpenRouter price** | $0.95/$3.00 | **$0.56/$1.76** ↓ 41% |
| GLM-5.1 OpenRouter price | Not listed | **$0.966/$3.036** (new) |
| MiMo-V2.5-Pro OR price | $0.44/$0.87 | $0.435/$0.87 (≈same) |
| Design Arena data | Not in REFERENCE | **Added** — GLM-5.2 #1 on website/codecategories/3D |
| Go model list | 13 models | **Unchanged** (13 models, same limits) |

### Fresh Data Delta (Jun 17 scrape vs REFERENCE)

| Finding | REFERENCE.md (Jun 13) | Live Scrape (Jun 17) |
|---|---|---|
| **GLM-5.2** on Go | Not listed | **New** — 880/5h, 4,300/mo |
| Kimi K2.7 Code 5h limit | 1,850 | **1,350** ↓ |
| MiniMax M3 on Zen | $0.60/$2.40 | **Removed** from Zen pricing |
| MiMo-V2.5 (paid) on Zen | $0.14/$0.28 | **Removed** from Zen pricing |
| MiMo-V2.5-Pro on Zen | $1.74/$3.48 | **Removed** from Zen pricing |
| Claude Fable 5 on Zen | Not listed | **New** ($10/$50) |
| Qwen3.7 Plus on Zen | Not listed | **New** ($0.40/$1.60) |
| Claude Sonnet 4 status | Active | **Deprecated** (Jun 15) |
| Arena Agent sessions | 260K+ | **786K+** ↑ |
| Arena Agent date | Jun 14 | **Jun 15** |
| MiniMax M2.5 on Go | 6,300/5h | **Removed** from Go model list |
| Kimi K2.5 on Go | 1,850/5h | **Removed** from Go model list |
| GLM-5 on Go | 1,150/5h | **Removed** from Go model list |
| DeepSeek V4 Pro Zen cached | $0.0145 | **$0.145** ↑ 10× |
| DeepSeek V4 Flash cached read | $0.03 | **$0.028** ↓ minor |

### Key Operational Findings

- **GLM-5.2**: variant `"max"` recommended for coding (default). `"high"` for faster/cheaper.
- **Hy3**: variant `"high"` for coding tasks, `"low"` for speed. `no_think` default. Text-only (no vision). **OpenRouter only** ($0.14/$0.58 DeepInfra) — NOT on Go/Zen. Structured output errors 7.39% (DeepInfra) / 11.03% (AtlasCloud); tool call errors 4.37% (DeepInfra) / 3.40% (AtlasCloud). Monitor tool-calling reliability. AA Intelligence Index 34 (#23/94) is below all Go models — consider only for council/provider diversity, not as primary fixer.
- **kimi-k2.6** needs `prefill_no_think=true` to suppress excessive CoT
- **deepseek-v4-flash** needs 24k max_tokens to avoid empty responses
- **deepseek-v4-pro** is impractically slow (~5-10 min/query)
- **minimax-m2.5** and **minimax-m2.5-free** are broken (API malformed responses)
- **nemotron-3-super-free** is unstable
- **big-pickle** is experimental, not production-ready

## Tencent Hy3 (Released July 6, 2026)

Tencent's Hunyuan 3.0 — 295B MoE, 21B active, **Apache 2.0** open weights. Open-sourced on HuggingFace (tencent/Hy3). **OpenRouter only** (`tencent/hy3`) — NOT available on OpenCode Go or Zen as of July 13, 2026.

### Architecture & Specs

| Property | Value |
|---|---|
| Total parameters | 295B |
| Active parameters | 21B |
| Architecture | MoE (192 experts, top-8) |
| MTP layer | 3.8B (speculative decoding) |
| Context window | 256K tokens |
| License | Apache 2.0 |
| Modalities | Text-only |
| Reasoning modes | no_think (default), low, high |

### Benchmarks

| Benchmark | Hy3 | GLM-5.2 | GPT-5.5 | Notes |
|---|---|---|---|---|
| SWE-bench Verified | **78%** | — | — | ⚠️ Tencent-reported, not on official SWE-bench leaderboard |
| SWE-bench Pro | 57.9 | 62.1 | 58.6 | Tencent-reported |
| GPQA Diamond | 90.4 | 91.2 | 93.6 | |
| HLE | 53.2 | 40.5 | — | Beats GPT-5.5 on FrontierScience |
| WildClawBench Overall | 53.6 | — | — | |
| Apex Agents | 25.6 | — | — | |
| Skillsbench V1.1 | 55.3 | — | — | |
| DeepSWE | **28** | 44% | 70% | Tencent self-reported, not on official DeepSWE leaderboard |
| Arena Agent | **N/A** | +6.54% | +8.90% | Not yet evaluated (released Jul 6) |

**Blind expert evaluation** (270 experts, Tencent-conducted): Hy3 scored **2.67/4**, outperforming GLM-5.1 (2.51/4). Strongest in frontend development, data & storage, CI/CD.

### Artificial Analysis & OpenRouter Metrics

- **AA Intelligence Index**: **34** (rank #23/94) — below all Go models (GLM-5.2=51, Qwen3.7 Max=56.6, DeepSeek V4 Flash=40)
- **AA output speed**: **162.5 tok/s** (rank #9/94)
- **AA calculated price**: $0.123/$0.43 per 1M tokens
- **Structured output error**: 7.39% (DeepInfra), 11.03% (AtlasCloud)
- **Tool call error**: 4.37% (DeepInfra), 3.40% (AtlasCloud)
- **Throughput**: 30 tok/s (GMICloud), 15 tok/s (AtlasCloud), 10 tok/s (DeepInfra)

### Pricing

| Provider | Input $/1M | Output $/1M | Cache Read $/1M | Notes |
|---|---|---|---|---|
| OpenRouter (DeepInfra) | $0.14 | $0.58 | $0.035 | Cheapest OR provider |
| OpenRouter (GMICloud) | $0.14 | $0.58 | $0.035 | |
| OpenRouter (AtlasCloud) | $0.20 | $0.80 | $0.10 | |
| OpenRouter (free tier) | Free | Free | — | `tencent/hy3:free` |
| Tencent Cloud | ~$0.18 | ~$0.59 | ~$0.06 | |

### Key Takeaways

- **OpenRouter only** — NOT on OpenCode Go or Zen; route via `tencent/hy3` or `omniroute/openrouter/tencent/hy3`
- **SWE-bench Verified 78%** ⚠️ is Tencent-reported and not on the official SWE-bench leaderboard
- **DeepSWE 28** is Tencent self-reported and not on the official DeepSWE leaderboard
- **AA Intelligence Index 34 (#23/94)** — below every Go model; weak standalone reasoning
- **47% fewer tokens** than GLM-5.2 in WorkBuddy document processing — cost-efficient when it works
- **Apache 2.0** — fully open weights, commercially usable
- **Text-only** — no vision capability, cannot serve as observer
- **Structured output errors** 7.39-11.03% and **tool call errors** 3.40-4.37% on OpenRouter — may affect tool-calling reliability
- **Not a primary fixer** — kimi-k2.7-code (DeepSWE 31% independently verified, free on Go) beats Hy3 on every independent metric
- Consider only for **council/provider diversity** (Tencent family) at low cost, not for high-reliability agent roles

## External Benchmarks & Reviews (June–July 2026)

- **Artificial Analysis Intelligence Index v4.1** (Jun 17) — GLM-5.2 scores **51** (#1 open-weights). Leads MiniMax-M3 (44), DeepSeek V4 Pro (44), Kimi K2.6 (43). On Intelligence vs Cost per Task Pareto frontier at ~$0.46/task. Source: artificialanalysis.ai
- **DeepSWE v1.1** (datacurve.ai, **Jul 1**) — Updated to 10 models. GLM-5.2 at **44%±2%** (independently verified). kimi-k2.7-code at **31%±1%** — beats claude-sonnet-4.6 (30%). claude-sonnet-5 new at 54%±4%. Source: firecrawl.
- **DeepSWE v1** (datacurve.ai, Jun 11) — 17 models. Go models: kimi-k2.6 24%, minimax-m3 20%, mimo-v2.5-pro 19%, qwen3.7-max 18%, glm-5.1 18%. Source: agent-browser.
- **Agent Arena** (arena.ai, **Jul 8**) — **947K+** sessions, 32 models. GLM-5.2 (Max) **+6.54%** (#1 open model, #10 overall). #1 tied lowest Tool Hallucination. Source: firecrawl.
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

## Data Sources

| Source | URL/Access | What It Provides |
|---|---|---|
| DeepSWE Leaderboard | https://deepswe.datacurve.ai/ | Pass@1, avg cost, avg time per coding task (v1.1 + v1) |
| SWE-rebench | https://swe-rebench.com/ | Pass@1, Pass@5 per model on SWE-bench tasks |
| OpenCode Go | https://opencode.ai/docs/go/ | Go subscription model list + request limits |
| OpenCode Zen | https://opencode.ai/docs/zen | Zen PAYG pricing per 1M tokens (input/output/cached) |
| models.dev | https://models.dev/ | Canonical model metadata (context window, modalities, tool support) |
| **Artificial Analysis** | **https://artificialanalysis.ai/models** | **Intelligence Index, output speed, cost per task, latency, context window, pricing — per-model pages have rich structured data** |
| CloudPrice | https://cloudprice.net/models | Cross-provider pricing tables |
| LM Arena Agent | https://arena.ai/leaderboard/agent | Causal treatment-effect ranking of agent orchestrator models across 5 signals, 947K+ sessions |
| Design Arena | https://designarena.ai/leaderboard | UI/UX, code generation, 3D, website, fullstack agent ELO rankings |
| LiveBench | https://livebench.ai/ | Contamination-freshened objective benchmark |
| GLM-5.2 Blog (Z.ai) | https://z.ai/blog/glm-5.2 | Official GLM-5.2 benchmark table |
| **OpenRouter Catalog** | MCP tools: `openrouter_models-list`, `openrouter_model-get`, `openrouter_model-endpoints` | Live model catalog with pricing, context, provider endpoints, latency |
| **OpenRouter Benchmarks** | MCP tools: `openrouter_benchmarks`, `openrouter_rankings-daily` | AA Intelligence/Coding/Agentic indices, Design Arena ELO, daily rankings |

## Manual agent-browser workflow (interactive scraping)

```bash
# Prerequisite: npm i -g agent-browser && agent-browser install

# DeepSWE leaderboard
agent-browser open "https://deepswe.datacurve.ai/"
agent-browser wait 3000
agent-browser snapshot --compact --depth 15

# Try both v1 and v1.1 tabs
agent-browser snapshot -i | grep -i "v1\.1\|button.*v1"
agent-browser click @e<N>  # click version button
agent-browser wait 1000
agent-browser snapshot --compact --depth 15

# GLM-5.2 model card on HuggingFace
agent-browser open "https://huggingface.co/zai-org/GLM-5.2"
agent-browser snapshot --compact --depth 12

# OpenCode docs
agent-browser open "https://opencode.ai/docs/go/"
agent-browser snapshot --compact --depth 12
agent-browser open "https://opencode.ai/docs/zen/"
agent-browser snapshot --compact --depth 12

# models.dev registry
agent-browser open "https://models.dev/api.json"
agent-browser snapshot --compact --depth 10

# LM Arena Agent leaderboard
agent-browser open "https://arena.ai/leaderboard/agent/"
agent-browser wait --load networkidle
agent-browser snapshot --compact --depth 20
agent-browser snapshot -i

# View methodology
agent-browser click @e<View Methodology>
agent-browser wait --load networkidle
agent-browser snapshot --compact --depth 15

# Annotated screenshot
agent-browser screenshot --full --annotate
```

## Go Pool Allocation Strategy

Go subscription has shared per-model request pools. Multiple agents using the same model compete for the same pool. Optimize by spreading agents across models:

```jsonc
// Pool strategy (v9, Jul 13):
// Two presets: "quality" (best work) and "value" (routine tasks)
// Constraint: NO Claude/OpenAI/Gemini — affordable models only
// NOTE: Hy3 is NOT on Go/Zen — OpenRouter only

"quality_preset": {
  "glm-5.2 (4.3K/mo Go + OR overflow)":  "Orchestrator + Oracle + Designer + Council",  // #1 model, max variant
  "kimi-k2.7-code (9.25K/mo Go)":         "Fixer",                                       // DeepSWE 31% (verified), Arena +0.13%
  "mimo-v2.5 (150K/mo Go)":              "Explorer + Librarian",
  "minimax-m3 (16K/mo Go)":              "Observer"                                     // Multimodal
}

"value_preset": {
  "mimo-v2.5 (150K/mo Go)":              "Orchestrator + Librarian + Designer + Council",
  "deepseek-v4-flash (158K/mo Go)":      "Explorer + Fixer",                            // 158K/mo, cheapest
  "qwen3.7-plus (21K/mo Go)":            "Oracle",
  "minimax-m3 (16K/mo Go)":              "Observer"
}
```

All pools are separate — no contention. GLM-5.2's 4,300/mo is enough for Oracle + Council since both are low-volume.

**OpenRouter as overflow:** Models not available on Go (e.g. Claude Opus 4.8, GPT-5.5) or with cheaper OpenRouter pricing can be routed via OpenRouter by specifying the OpenRouter model ID.

See request limits per model in the OpenCode Go Plan table above.

## Pricing Strategy Rules

1. **Go subscription** is better for high-volume agents (Explorer, Librarian, Fixer) — $10/mo flat with generous limits
2. **Zen PAYG** is better for occasional-use agents (Council, Oracle) — pay per token, no monthly commitment
3. **Free models** (DeepSeek V4 Flash Free, MiMo-V2.5 Free, Nemotron 3 Super Free) are viable for experimental/toy presets only — unreliable quality
4. **OpenRouter PAYG** is a viable third provider — often cheaper than Zen for the same model (e.g. GLM-5.2: $0.56/$1.76 on OpenRouter DeepInfra vs $1.40/$4.40 on Zen — 60% cheaper; DeepSeek V4 Flash: $0.09/$0.18 on OR vs $0.14/$0.28 on Zen). Use OpenRouter for models that are expensive on Zen or have better provider options (via `openrouter_model-endpoints`).
5. **Same model on both Go + Zen** → use Go (already paid for), unless you need higher rate limits
6. **Same model on OpenRouter vs Zen** → compare price with `openrouter_model-endpoints`; OpenRouter often wins on price and offers more provider choices

## Cost to Run a Benchmark

Running DeepSWE (113 tasks × mini-swe-agent) on missing models via Zen PAYG:

| Model | Est 113 tasks | Est 20 tasks (recommended) |
|---|---|---|
| qwen3.7-max | ~$89 | ~$16 |
| qwen3.6-plus | ~$46 | ~$8 |
| glm-5.2 | ~$42 | ~$7.50 |
| kimi-k2.5 | ~$39 | ~$7 |
| deepseek-v4-flash | ~$35 | ~$6 |

Highest ROI targets: **glm-5.2** ($~7.50 for 20 tasks — 46% DeepSWE, best Go model), **deepseek-v4-flash** ($~6 — cheapest reliable). Use `pier run -p deep-swe/tasks --n-tasks 20 --sample-seed 0` for subset.

## Cost Comparison Heuristics

For a given model, estimate monthly cost:

- **Go (already subscribed)**: $0 additional per request (within limits)
- **Go (need upgrade)**: $10/mo base + top-up if exceeding $60/mo
- **Zen**: (avg input_tokens × input_price + avg output_tokens × output_price) × requests_per_month
- **OpenRouter PAYG**: (avg input_tokens × input_price + avg output_tokens × output_price) × requests_per_month. Get per-model pricing via `openrouter_model-get` or `openrouter_model-endpoints`. OpenRouter often has the cheapest endpoints for open models.

**OpenRouter price-check shortcut:** Use the MCP tools directly:

```bash
# Check cheapest provider for a model
openrouter_model-endpoints author="z-ai" slug="glm-5.2"
# → DeepInfra at $0.56/$1.76 per 1M tokens (cheapest, FP8)
# → StreamLake at $0.49/$1.54 (cheapest raw, FP8)
# → Z.AI direct at $0.90/$3.08 (matches OpenRouter listed price)
# → Z.AI direct at $1.40/$4.40 (matches Zen)

# List all models with pricing sorted cheapest-first
openrouter_models-list sort="pricing-low-to-high"
```

See `scripts/fetch-pricing.sh` for automated cost estimation.

## Artificial Analysis Intelligence Index Data

Live data at https://artificialanalysis.ai/models — fetched via firecrawl.

AA provides the **AA Intelligence Index v4.1** (composite of 10 evals: GDPval-AA v2, τ³-Banking, Terminal-Bench v2.1, SciCode, HLE, GPQA Diamond, CritPt, AA-Omniscience, AA-LCR), plus output speed (t/s), latency, cost per task, and context window per model.

### Go Model AA Profile (live, Jul 9, 2026)

| Model | AA Intel Index | Output Speed (t/s) | Cost/Task | Context | Active Params |
|---|---|---|---|---|---|
| GLM-5.2 (max) | **51** | **199** | ~$0.37 | 1M | 40B |
| Kimi K2.7 Code | — | ~46 | — | 128K | — |
| Kimi K2.6 | ~43 | ~42 | ~$1.18 | 128K | — |
| MiniMax M3 | ~44 | ~109 | ~$0.33 | 1M | — |
| MiMo-V2.5-Pro | ~42 | ~53 | ~$0.17 | 256K | — |
| GLM-5.1 | ~40 | ~72 | ~$0.48 | 203K | — |
| DeepSeek V4 Pro | ~44 | ~64 | ~$0.22 | 1M | — |
| DeepSeek V4 Flash | ~40 | ~128 | ~$0.18 | 1M | — |

Notes: AA Intelligence Index v4.1. Values without explicit AA scores are estimated from OpenRouter metadata. "Cost/Task" = weighted avg cost per AA Intelligence Index task. GLM-5.2 output speed of 199 t/s is well above average for its size class (median: 58 t/s).

### Using AA Data via Firecrawl

```bash
# Scrape per-model page for full metrics
firecrawl_scrape url="https://artificialanalysis.ai/models/glm-5-2" formats="markdown" waitFor=5000

# Search for specific model
firecrawl_search query="site:artificialanalysis.ai GLM 5.2 intelligence coding agentic index"
```

AA data complements DeepSWE and Arena Agent: AA measures **standalone reasoning** (not agentic tool use), so it's orthogonal to those other benchmarks. High AA + high Arena = strong all-around model (GLM-5.2). High AA + low Arena = good standalone reasoning but poor tool orchestration.

## Firecrawl as Data Source

Firecrawl is the primary web-data engine for this skill alongside OpenRouter MCP:

| Source | Firecrawl Method | Reliability | Notes |
|---|---|---|---|
| DeepSWE | `firecrawl_scrape` with waitFor=3000 | Good | JS-rendered table; markdown mode captures text |
| Arena Agent | `firecrawl_scrape` with waitFor=5000 | Good | Server-rendered; markdown mode captures full table |
| OpenCode Go | `firecrawl_scrape` | Excellent | Static HTML |
| OpenCode Zen | `firecrawl_scrape` | Excellent | Static HTML |
| Artificial Analysis | `firecrawl_scrape` with waitFor=5000 | Medium | JS-heavy; text metrics extractable but chart data is visual-only |
| Design Arena | `firecrawl_scrape` with waitFor=3000 | Medium | Large page; search for specific model names |
| OpenRouter pricing | `firecrawl_scrape` | Excellent | Static model listing pages |
| Z.ai blog | `firecrawl_scrape` | Excellent | Static blog content |

**Firecrawl search** (`firecrawl_search`) is for discovering URLs before scraping. Always call `firecrawl_search_feedback` with the search ID after using results to improve quality and refund 1 credit.

## Data Quality Notes

- **DeepSWE** uses JS-rendered tables with interactive filters. `agent-browser` is required for accurate scraping — `curl` alone cannot extract the data. Firecrawl with `waitFor` can partially extract it (markdown mode captures the table text).
- **OpenCode docs** (Go, Zen) are server-rendered Markdown/HTML. Both `curl` and `agent-browser` work, but `agent-browser` handles rate-limiting and mobile-redirect cases better.
- **models.dev** exposes a static JSON API at `/api.json`. Either tool works.
- **LM Arena Agent** uses a causal evaluation framework (not pairwise votes). The page is server-rendered. Firecrawl extracts the full table in markdown mode. `agent-browser snapshot --compact --depth 20` also works. The methodology page at arena.ai/blog/agent-arena explains the causal tracing approach.
- **GLM-5.2 Blog (Z.ai)** is a vendor-run benchmark. However, the DeepSWE scores are reliable for cross-model comparison: Z.ai used the official mini-swe-agent harness and all comparison-model scores match the official DeepSWE leaderboard exactly (within ±1%). Other benchmarks (SWE-bench Pro, Terminal-Bench, etc.) may use different harnesses/configs across models — treat those as directional.
- **Screenshots**: Use `agent-browser screenshot --annotate` to capture visual page state for tables with complex formatting or charts.
- **OpenRouter MCP data** (`openrouter_models-list`, `openrouter_benchmarks`, `openrouter_rankings-daily`) is live data from the OpenRouter API — always up to date, no scraping needed. **Note:** AA and Design Arena benchmarks require authentication via `openrouter_benchmarks`. The Artificial Analysis indices are updated regularly by OpenRouter. This is the most reliable source for current pricing cross-referencing.
- **Data volatility**: Pricing and leaderboard data changes frequently. Always re-fetch before making config decisions. Tables in this file are snapshots, not live. Use OpenRouter MCP tools for live data whenever possible.
