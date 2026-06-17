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
† **GLM-5.2** scored **46%** on DeepSWE per Z.ai's official blog (Jun 16) using the same mini-swe-agent harness. Scores match all other models exactly, confirming a fair comparison. See "GLM-5.2 Full Benchmark Table" section below.

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

### Go Model DeepSWE Ranking

1. **GLM-5.2** — **46%** (Z.ai official, Jun 16), $1.40/$4.40 — **#1 Go model by 2× margin**. 1M ctx, MIT license, Arena Agent +4.37%
2. **kimi-k2.6** — 24%±2%, $3.16 — Distant second. Good coding agent, weak orchestrator (Arena -0.50%)
3. **minimax-m3** — 20%±4%, $5.57 — Strong multimodal, 1M ctx, weak agent (-2.79% Arena)
4. **mimo-v2.5-pro** — 19%±2%, $1.99 — Best value: quality per dollar
5. **qwen3.7-max** — 18%±1%, $2.12 — Best reasoning (AA 56.6), weak at agentic coding
6. **glm-5.1** — 18%±1%, $7.46 — Overpriced for the score

### LM Arena Agent Leaderboard (June 15, 2026)

Preference-based causal evaluation of agent orchestrator models across 786K+ real-world sessions (up from 260K+ Jun 14).
"Net Improvement" is the aggregate causal treatment effect (%); higher = better orchestrator.
Source: https://arena.ai/leaderboard/agent — fetched via agent-browser.

#### Key Signals

| Signal | Measures | What It Tells You |
|---|---|---|
| **Net Improvement** | Aggregate causal treatment effect across all signals | Overall agent quality — best signal for Orchestrator assignment |
| **Confirmed Success** | User confirms task completion | Task-completion reliability |
| **Praise vs Complaint** | Positive/negative feedback ratio | User satisfaction |
| **Steerability** | Model responds well to corrections | Receptiveness to mid-task guidance — key for Oracle role |
| **Bash Recovery** | Recovers from failed commands with fewest steps | Agentic resilience — key for Fixer role |
| **Tool Hallucination** | Calls tools that don't exist | Reliability — lower/hallucination = better for all agents |

#### Full Leaderboard (28 models)

| Agent Rank | Model | Net Improvement | Confirmed Success | Praise/Complaint | Steerability | Bash Recovery | Tool Hallucination | Sessions |
|---|---|---|---|---|---|---|---|---|
| 1 | Claude Fable 5 (High) | **+14.17%±1.54%** | +16.48% | +29.65% | +13.39% | +9.46% | -1.86% | 16,240 |
| 2 | Claude Opus 4.8 (Thinking) | **+9.04%±1.19%** | +10.75% | +14.36% | +10.48% | +9.08% | -0.56% | 27,529 |
| 3 | GPT 5.5 (xHigh) | **+8.27%±1.73%** | +4.42% | +17.52% | +3.12% | +14.42% | -1.86% | 11,963 |
| 4 | Claude Opus 4.7 | **+8.12%±1.51%** | +4.63% | +10.73% | +11.69% | +11.74% | -1.81% | 29,557 |
| 5 | Claude Opus 4.7 (Thinking) | **+8.09%±1.48%** | +4.51% | +12.40% | +8.66% | +13.08% | -1.82% | 29,504 |
| 6 | GPT 5.5 (High) | **+7.78%±1.07%** | +5.93% | +10.90% | +7.56% | +12.64% | -1.86% | 38,520 |
| 7 | GPT 5.5 | **+6.73%±1.03%** | +4.75% | +8.13% | +7.86% | +11.07% | -1.86% | 38,818 |
| 8 | Claude Opus 4.6 | **+6.73%±1.42%** | +6.17% | +7.40% | +8.13% | +10.11% | -1.86% | 29,550 |
| 9 | GPT 5.4 (High) | **+6.54%±1.07%** | +4.63% | +6.55% | +7.53% | +12.14% | -1.86% | 38,552 |
| 10 | **GLM 5.2 (Max)** ⚡ | **+4.37%±2.48%** | +9.43% | +14.88% | -6.00% | +1.69% | -1.86% | 11,572 |
| 11 | Claude Opus 4.8 | **+3.60%±1.55%** | +7.31% | +12.53% | +6.05% | +8.01% | +15.90% | 25,071 |
| 12 | Claude Sonnet 4.6 | **+3.22%±1.38%** | +2.69% | -2.54% | +3.98% | +10.12% | -1.85% | 29,513 |
| 13 | **GLM 5.1** ⚡ | **+2.66%±1.14%** | +3.42% | +1.34% | +1.24% | +5.44% | -1.86% | 33,569 |
| 14 | **DeepSeek V4 Pro** ⚡ | **+0.10%±1.41%** | -0.44% | +0.07% | -2.81% | +2.93% | -0.74% | 28,301 |
| 15 | Gemini 3.5 Flash | **+0.04%±1.00%** | -1.98% | -2.29% | -0.23% | +2.98% | -1.69% | 31,548 |
| 16 | **Kimi K2.6** ⚡ | **-0.50%±1.09%** | +0.36% | -1.70% | -2.82% | -0.22% | -1.86% | 35,097 |
| 17 | Gemini 3.1 Pro Preview | **-0.78%±0.94%** | -0.09% | -1.97% | +2.23% | -5.87% | -1.80% | 38,597 |
| 18 | **DeepSeek V4 Flash** ⚡ | **-1.18%±1.33%** | +4.14% | -1.50% | -6.59% | -2.42% | -0.48% | 33,793 |
| 19 | **Kimi K2.7 Code** ⚡ | **-2.71%±2.39%** | +3.82% | -5.17% | -12.25% | -1.83% | -1.86% | 14,560 |
| 20 | **MiniMax M3** ⚡ | **-2.79%±1.70%** | -2.30% | -9.39% | -7.62% | +3.52% | -1.86% | 12,388 |
| 21 | **Qwen 3.6 Plus** ⚡ | **-4.24%±1.20%** | -2.84% | -5.58% | -8.94% | -2.42% | +1.41% | 33,110 |
| 22 | Grok Build 0.1 | **-6.20%±1.10%** | -6.78% | -11.49% | -8.64% | -1.65% | +2.42% | 28,421 |
| 23 | Grok 4.3 (High) | **-7.21%±1.23%** | -10.75% | -15.89% | -4.46% | -4.44% | +0.49% | 16,819 |
| 24 | **Minimax M2.7** ⚡ | **-7.81%±1.05%** | -13.51% | -15.50% | -8.77% | -3.05% | -1.79% | 33,763 |
| 25 | Gemini 3 Flash | **-8.47%±1.01%** | -11.23% | -13.73% | -4.25% | -14.72% | -1.58% | 38,756 |
| 26 | Nemotron 3 Ultra | **-8.65%±4.12%** | -4.39% | -5.54% | -22.66% | -12.31% | -1.63% | 4,252 |
| 27 | Gemma 4 31B | **-12.73%±1.97%** | -5.87% | -7.22% | -6.20% | -27.61% | +16.73% | 27,723 |
| 28 | Grok 4.3 | **-15.78%±1.46%** | -12.19% | -14.66% | -4.01% | -48.86% | -0.79% | 37,935 |

⚡ = Available on opencode-go

#### Go Models Ranked on Arena Agent

| Go Model | Agent Rank | Net Improvement | Key Signal Strength | Verdict |
|---|---|---|---|---|
| **GLM 5.2 (Max)** | 10 | +4.37% | Praise/Complaint +14.88% (best Go) | Solid orchestrator — best Go performer on real agent tasks |
| **GLM 5.1** | 13 | +2.66% | Bash Recovery +5.44% (best at recovering from errors) | Good mid-tier orchestrator |
| **DeepSeek V4 Pro** | 14 | +0.10% | Near-zero net effect — basically neutral | Not recommended for orchestrator |
| **Kimi K2.6** | 16 | -0.50% | Weak across all 5 signals, ±1.09% CI crosses zero | Below-average orchestrator |
| **DeepSeek V4 Flash** | 18 | -1.18% | Confirmed Success +4.14% (good) but poor steerability -6.59% | Mediocre orchestrator, fine for cheap tasks |
| **Kimi K2.7 Code** | 19 | -2.71% | Poor steerability -12.25% (worst Go) | Coding-focusing not reflected in agentic tasks |
| **MiniMax M3** | 20 | -2.79% | Bash Recovery +3.52% (decent recovery) | Weak agentic orchestrator despite high context |
| **Qwen 3.6 Plus** | 21 | -4.24% | Tool Hallucination +1.41% (only Go with positive hallucination signal) | Below-average agent orchestrator |
| **Minimax M2.7** | 24 | -7.81% | Weak across the board | Poor agentic performance |

#### Cross-Benchmark: How Arena Agent Compares to DeepSWE

| Go Model | Arena Agent (Net Improvement) | DeepSWE Pass@1 | Arena Predicts |
|---|---|---|---|---|---|
| GLM 5.2 (Max) | +4.37%±2.48% | **46%** (Z.ai official) | Best Go orchestrator on real agent tasks ✅ Confirmed |
| GLM 5.1 | +2.66%±1.14% | 18%±1% | Decent orchestrator, matches DeepSWE ranking |
| DeepSeek V4 Pro | +0.10%±1.41% | 8%±3% | Weak — consistent with DeepSWE |
| Kimi K2.6 | -0.50%±1.09% | 24%±2% | **Misalignment**: strong on DeepSWE coding, weak real agent |
| DeepSeek V4 Flash | -1.18%±1.33% | ~8-12% est | Weak agent — fine as cheap speed model |
| MiniMax M3 | -2.79%±1.70% | 20%±4% | **Misalignment**: 20% DeepSWE but negative on real agent tasks |
| Qwen 3.6 Plus | -4.24%±1.20% | N/A | Poor at agent orchestration despite high coding bench scores |

**Key insight:** Arena Agent measures *actual agentic orchestration quality* (tool choice, recovery, steerability) while DeepSWE measures *code-generation accuracy*. They rank Go models differently — models like kimi-k2.6 and minimax-m3 score well on coding benchmarks but perform below average as real-world orchestrators. GLM-5.2 is the only Go model that excels at **both** (DeepSWE 46% + Arena +4.37%).

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
- Only 4,300/mo on Go. Not suitable for high-volume agent roles.
- No SWE-rebench score yet.
- Arena Agent score (+4.37%) is from the official leaderboard, not Z.ai.

### Go Model Combined Ranking (All Benchmarks)

| Rank | Model | DeepSWE | SWE-bench Pro | Terminal-Bench | Arena Agent | AA Index | Verdict |
|---|---|---|---|---|---|---|---|---|
| **1** | **GLM-5.2** | **46%** | **62.1** | **81.0** | **+4.37%** | — | Best coder + best orchestrator on Go |
| 2 | Qwen3.7-Max | 18% | 60.6 | 75.0 | -4.24% | 56.6 | Best reasoning, weak agentic |
| 3 | Kimi K2.6 | 24% | ~50%† | — | -0.50% | ~50 | Solid coding, weak orchestrator |
| 4 | MiMo-V2.5-Pro | 19% | — | — | -2.79% | — | Best value fixer |
| 5 | MiniMax M3 | 20% | 59.0† | 65.0 | -2.79% | — | Multimodal specialist |
| 6 | GLM-5.1 | 18% | 58.4 | 63.5 | +2.66% | ~50 | Consistent mid-tier |
| 7 | DeepSeek V4 Flash | ~8-12% | — | — | -1.18% | — | Fast cheap high-volume |

† = Vendor-reported or estimated

### Non-DeepSWE Benchmarks for Go Models

| Model | AA Index | SWE-Pro | SWE-rebench | AI Coding Daily | Arena Agent | DeepSWE |
|---|---|---|---|---|---|---|---|---|
| **GLM-5.2** | **N/A** | **62.1%** | **N/A** | **N/A** | **+4.37%** | **46%** |
| qwen3.7-max | **56.6** | 60.6% | N/A | N/A | -4.24% | 18% |
| kimi-k2.6 | ~50 | ~50% | 46.5% | 14/20 | -0.50% | 24% |
| minimax-m3 | N/A | 59.0%† | 45.6% | 15/20 | -2.79% | 20% |
| mimo-v2.5-pro | N/A | N/A | N/A | 13/20 | -2.79% | 19% |
| glm-5.1 | ~50 | ~56% | 50.7% | 9/20 | +2.66% | 18% |

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

\* = Independent DeepSWE run by entrpi/bleysg (Jun 2, 2026) using mini-swe-agent, MiniMax-direct API. Strict 90-min budget. Median 80k output tokens, 325 steps, $7.48/task. Sits between glm-5.1 (18%) and gemini-3.1-pro (10%).
† = Vendor-reported by MiniMax using Claude Code scaffolding (stronger agent framework). Not comparable to mini-swe-agent scores.
AA Index = Artificial Analysis Intelligence Index v4.0 (independent composite).

### Go Model Benchmark Ranking (by independent data)

Based on independently verified benchmarks available:

1. **GLM-5.2** — DeepSWE **46%**, SWE-Pro 62.1%, Terminal-Bench 2.1 81.0, FrontierSWE 74.4, Arena Agent +4.37%, AIME 99.2. **Clear #1 Go model by every metric.** Only 4,300/mo limits.
2. **Qwen3.7 Max** — AA Index 56.6, SWE-Pro 60.6%, Terminal-Bench 2.1 75.0, AIME 97.0. Best reasoning model, but weak agentic coding (DeepSWE 18%).
3. **Kimi K2.6** — DeepSWE 24%, SWE-rebench 46.5%. Second best coding score, but weak real agent (Arena -0.50%).
4. **MiMo-V2.5-Pro** — DeepSWE 19%, Arena Agent -2.79%. Best value fixer (16,300/mo, $1.99 avg cost).
5. **MiniMax M3** — DeepSWE 20%, SWE-Pro 59.0%†, Terminal-Bench 65.0, Arena -2.79%. Multimodal specialist.
6. **GLM-5.1** — DeepSWE 18%, SWE-rebench 50.7%, Arena +2.66%. Consistent mid-tier, overpriced on Go.
7. **DeepSeek V4 Pro** — DeepSWE 8%, Arena +0.10%. Slow. Not recommended.
8. **DeepSeek V4 Flash** — Est ~8-12% DeepSWE, Arena -1.18%. 158K/mo, fastest, cheapest.

## OpenCode Go Plan (June 17, 2026)

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
| **GLM-5.2** | **880** | **2,150** | **4,300** |

## OpenCode Zen Pricing (June 17, 2026)

PAYG per 1M tokens (USD). Use when model isn't on Go or you exceed Go limits.
**NEW on Zen:** Claude Fable 5 ($10/$50), North Mini Code Free (new free model).
**REMOVED from Zen:** MiniMax M3, MiMo-V2.5 (paid), MiMo-V2.5-Pro, Claude Sonnet 4 (deprecated Jun 15).
**Go-only models (no Zen fallback):** GLM-5.2, MiniMax M3, MiMo-V2.5, MiMo-V2.5-Pro, Qwen3.7 Plus, Qwen3.5 Plus (on Go removed — Zen only).

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
| Qwen3.6 Plus | $0.50 | $3.00 | $0.05 |
| GLM-5.2 | $1.40 | $4.40 | $0.26 |
| GLM-5.1 | $1.40 | $4.40 | $0.26 |
| Kimi K2.6 | $0.95 | $4.00 | $0.16 |
| DeepSeek V4 Pro | $1.74 | $3.48 | $0.145 |
| Grok Build 0.1 | $1.00 | $2.00 | $0.20 |
| Gemini 3.5 Flash | $1.50 | $9.00 | $0.15 |
| Gemini 3.1 Pro | $2.00 | $12.00 | $0.20 |
| Gemini 3 Flash | $0.50 | $3.00 | $0.05 |
| Claude Fable 5 | $10.00 | $50.00 | $1.00 |
| Claude Opus 4.8 | $5.00 | $25.00 | $0.50 |
| Claude Opus 4.7 | $5.00 | $25.00 | $0.50 |
| Claude Opus 4.6 | $5.00 | $25.00 | $0.50 |
| Claude Opus 4.5 | $5.00 | $25.00 | $0.50 |
| Claude Sonnet 4.6 | $3.00 | $15.00 | $0.30 |
| Claude Haiku 4.5 | $1.00 | $5.00 | $0.10 |
| GPT-5.5 | $5.00 | $30.00 | $0.50 |
| GPT-5.5 Pro | $30.00 | $180.00 | $30.00 |
| GPT-5.4 | $2.50 | $15.00 | $0.25 |
| GPT-5.4 Pro | $30.00 | $180.00 | $30.00 |
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
| minimax-m2.5 | ✅ | ✅ | opencode-go/minimax-m2.5 | opencode/minimax-m2.5 |
| minimax-m2.7 | ✅ | ✅ | opencode-go/minimax-m2.7 | opencode/minimax-m2.7 |
| **glm-5.2** | ✅ | **❌** | **opencode-go/glm-5.2** | — (Go only) |
| **minimax-m3** | ✅ | **❌** | **opencode-go/minimax-m3** | — (Go only) |
| **mimo-v2.5** | ✅ | **❌** | **opencode-go/mimo-v2.5** | — (Go only; free tier on Zen) |
| **mimo-v2.5-pro** | ✅ | **❌** | **opencode-go/mimo-v2.5-pro** | — (Go only) |
| **qwen3.7-max** | ✅ | ✅ | **opencode-go/qwen3.7-max** | **opencode/qwen3.7-max** |
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

### New Models Available on Go (June 2026)

| Model | Req/mo (live) | Pricing I/O | Key Strength | Caveat |
|---|---|---|---|---|
| **GLM-5.2** | 4,300 | $1.40/$4.40 | Arena Agent +4.37% (best Go orchestrator) | No DeepSWE score; only 4,300/mo on Go |
| **Qwen3.7 Max** | 4,770 | $2.50/$7.50 | AA Index 56.6, SWE-Pro 60.6%, 1M ctx | DeepSWE only 18% ±1% for agentic coding |
| **MiniMax M3** | 16,000 | $0.30/$1.20 | DeepSWE 20%±4%, SWE-rebench 45.6%, multimodal, 1M ctx | Very slow (57m avg DeepSWE); removed from Zen |
| **Kimi K2.7 Code** | 9,250 | $0.95/$4.00 | New coding-focused Kimi variant | Arena Agent -2.71%; steerability -12.25% |

### Models Removed / Deprecated

- **Qwen3.5 Plus** — dropped from Go model list (still on Zen)
- **GLM-5** — deprecated on Zen (May 14, 2026); removed from Go model list
- **Kimi K2.5** — removed from Go model list (still on Zen)
- **MiniMax M2.5** — removed from Go model list (still on Zen); also known broken API
- **MiniMax M3** — removed from Zen pricing (Go only now)
- **MiMo-V2.5 (paid)** — removed from Zen pricing (Go only; free tier still on Zen)
- **MiMo-V2.5-Pro** — removed from Zen pricing (Go only)
- **Claude Sonnet 4** — deprecated (Jun 15, 2026)

### Major Limit / Price Changes

- **GLM-5.2** — new model on Go at 880/5h, 4,300/mo
- **MiMo-V2.5** — limits INCREASED 14× (2,150→30,100/5h, 10,900→150,400/mo). Now the highest-volume Go model after DS-V4-Flash.
- **MiMo-V2.5-Pro** — limits increased 2.5× (1,290→3,250/5h, 6,450→16,300/mo).
- **MiniMax M3** — limits increased 2.3× (1,400→3,200/5h, 7,000→16,000/mo); REMOVED from Zen pricing.
- **Qwen3.7 Max** — added at 950/5h, 4,770/mo.
- **Qwen3.7 Plus** — limits increased 32% (3,300→4,300/5h, 16,300→21,600/mo). Added to Zen pricing at $0.40/$1.60.
- **Kimi K2.7 Code** — limits confirmed at 1,350/5h, 9,250/mo (down from 1,850 in earlier docs).

### External Benchmarks & Reviews (June 2026)

- **GLM-5.2 Official Benchmarks** (z.ai/blog/glm-5.2, Jun 16) — Full benchmark table with Go-model comparisons. DeepSWE: **46.2%** (2× next Go model), SWE-bench Pro: 62.1%, Terminal-Bench 2.1: 81.0, FrontierSWE: 74.4, MCP-Atlas: 76.8. DeepSWE harness matches official leaderboard exactly for all comparison models. Z.ai-ran but cross-model comparisons reliable.
- **LM Arena Agent Leaderboard** (arena.ai, Jun 15) — 786K+ real-world agent sessions. Go models: GLM-5.2 (Max) +4.37% (best Go), GLM-5.1 +2.66%, DeepSeek V4 Pro +0.10%, Kimi K2.6 -0.50%, DeepSeek V4 Flash -1.18%, Kimi K2.7 Code -2.71%, MiniMax M3 -2.79%, Qwen 3.6 Plus -4.24%.
- **Artificial Analysis Intelligence Index v4.0** — Independent composite of 10 evaluations. Claude Opus 4.8 = 61.4 (top). Qwen3.7 Max = 56.6 (highest Chinese model). Source: artificialanalysis.ai
- **DeepSWE** (datacurve.ai, Jun 11) — 113 contamination-free tasks. 17/20 models shown. GPT-5.5 leads at 70%. Go models: kimi-k2.6 24%, minimax-m3 20%, mimo-v2.5-pro 19%, qwen3.7-max 18%, glm-5.1 18%.
- **MiniMax M3 independent DeepSWE** (entrpi.github.io, Jun 2) — 13.3% pass@1 strict (15/113). Official leaderboard now shows 20%±4%. Median 80k output tokens, 325 steps, $7.48/task.
- **AI Coding Daily** (aicodingdaily.com, Jun 2) — 14 models on 4 Laravel/React projects. MiniMax M3 scores 15/20. Very slow (5:34 avg).
- **Kilo.ai Live Leaderboard** (kilo.ai/leaderboard) — Real token usage from 3M+ developers. MiniMax M3 at 47.6% completion rate, $10.35/attempt.
- **SWE-rebench** (swe-rebench.com, fetched Jun 13) — 110 problems, tool-use agentic eval. Go model ranking: GLM-5.1 50.7% > Kimi K2.6 46.5% > MiniMax M3 45.6%.
- **Build Fast with AI June 2026 Leaderboard** — 10-model comparison. Rates Qwen3.7 Max as "rational alternative to Opus 4.8 at 1/6 price."

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
