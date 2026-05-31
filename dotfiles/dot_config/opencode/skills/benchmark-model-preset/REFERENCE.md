# Benchmark & Pricing Reference

## DeepSWE Leaderboard (May 30, 2026)

Coding agent benchmark — 113 tasks across TypeScript, Go, Python, JS, Rust.
Run on mini-swe-agent for consistency. Higher Pass@1 = better.

Sources: https://deepswe.datacurve.ai/

| Rank | Model [effort] | Pass@1 | ±CI | Avg Cost | Avg Time | Out Tok |
|---|---|---|---|---|---|---|
| 1 | gpt-5.5 [xhigh] | 70% | ±4% | $6.61 | 21m | 47k |
| 2 | claude-opus-4.8 [max] | 58% | ±5% | $12.58 | 43m | 136k |
| 3 | gpt-5.4 [xhigh] | 56% | ±5% | $4.38 | 27m | 71k |
| 4 | claude-opus-4.7 [max] | 54% | ±5% | $18.19 | 39m | 103k |
| 5 | claude-sonnet-4.6 [high] | 32% | ±4% | $5.52 | 42m | 76k |
| 6 | gemini-3.5-flash [medium] | 28% | ±4% | $7.42 | 17m | 189k |
| 7 | claude-opus-4.6 [max] | 28% | ±4% | $5.39 | 30m | 44k |
| 8 | gpt-5.4-mini [xhigh] | 24% | ±4% | $2.08 | 33m | 135k |
| 9 | **kimi-k2.6** | 24% | ±4% | **$3.16** | 56m | 84k |
| 10 | **mimo-v2.5-pro** | 19% | ±4% | **$1.99** | 28m | 49k |
| 11 | **glm-5.1** | 18% | ±4% | **$7.46** | 35m | 49k |
| 12 | grok-build-0.1 | 13% | ±3% | $6.60 | 44m | 52k |
| 13 | gemini-3.1-pro | 10% | ±3% | $1.84 | 36m | 53k |
| 14 | **deepseek-v4-pro** | 8% | ±2% | **$4.22** | 37m | 50k |
| 15 | gemini-3-flash | 5% | ±2% | $1.53 | 39m | 233k |

Note: Page showed 15/18 models. 3 models hidden behind a dropdown filter.

### Missing opencode-go models — extrapolated estimates

Models on Go plan not present on DeepSWE leaderboard.

| Model | Est Pass@1 | Rationale |
|---|---|---|
| **qwen3.6-plus** | ~30-40% | Similar tier to gpt-5.4-mini (24%). User bench: 100% acc on easier tasks |
| **glm-5** | ~22-28% | Slightly ahead of glm-5.1 (18%), similar to kimi-k2.6 tier |
| **kimi-k2.5** | ~22-28% | Slightly behind k2.6 (24%) |
| **qwen3.5-plus** | ~20-28% | Cheaper qwen, likely lower than 3.6 |
| **mimo-v2.5** | ~15-22% | Non-pro, weaker than v2.5-pro (19%) |
| **minimax-m2.7** | ~12-18% | Fast, small — decent for light tasks |
| **minimax-m2.5** | ~10-15% | Weaker than m2.7, also has API issues in user's test |
| **deepseek-v4-flash** | ~8-12% | Reasoning model, but weaker than v4-pro (8%) on hard tasks |

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

| Model | DeepSWE Pass@1 | SWE-rebench Resolved | Delta |
|---|---|---|---|
| kimi-k2.6 | 24% | 46.5% | +22.5pp |
| glm-5.1 | 18% | 50.7% | +32.7pp |

Gap between them narrows: DeepSWE favors Kimi (24% vs 18%), SWE-rebench favors GLM-5.1 (50.7% vs 46.5%). Suggests they're comparable — both valid for similar roles.

## OpenCode Go Plan (May 2026)

$10/mo ($5 first month). Limits in request count per model:

| Model | Req/5h | Req/week | Req/month |
|---|---|---|---|
| DeepSeek V4 Flash | 31,650 | 79,050 | 158,150 |
| Qwen3.5 Plus | 10,200 | 25,200 | 50,500 |
| MiniMax M2.5 | 6,300 | 15,900 | 31,800 |
| DeepSeek V4 Pro | 3,450 | 8,550 | 17,150 |
| MiniMax M2.7 | 3,400 | 8,500 | 17,000 |
| Qwen3.6 Plus | 3,300 | 8,200 | 16,300 |
| MiMo-V2.5 | 2,150 | 5,450 | 10,900 |
| MiMo-V2.5-Pro | 1,290 | 3,225 | 6,450 |
| GLM-5 | 1,150 | 2,880 | 5,750 |
| Kimi K2.6 | 1,150 | 2,880 | 5,750 |
| GLM-5.1 | 880 | 2,150 | 4,300 |

## OpenCode Zen Pricing (May 2026)

PAYG per 1M tokens (USD). Use when model isn't on Go or you exceed Go limits.

| Model | Input | Output | Cached Read |
|---|---|---|---|
| DeepSeek V4 Flash Free | Free | Free | Free |
| MiMo-V2.5 Free | Free | Free | Free |
| Nemotron 3 Super Free | Free | Free | Free |
| Big Pickle | Free | Free | Free |
| MiniMax M2.7 | $0.30 | $1.20 | $0.06 |
| MiniMax M2.5 | $0.30 | $1.20 | $0.06 |
| GLM-5 | $1.00 | $3.20 | $0.20 |
| GLM-5.1 | $1.40 | $4.40 | $0.26 |
| Kimi K2.5 | $0.60 | $3.00 | $0.10 |
| Kimi K2.6 | $0.95 | $4.00 | $0.16 |
| Qwen3.6 Plus | $0.50 | $3.00 | $0.05 |
| Qwen3.5 Plus | $0.20 | $1.20 | $0.02 |
| Claude Opus 4.6 | $5.00 | $25.00 | $0.50 |
| Claude Sonnet 4.6 | $3.00 | $15.00 | $0.30 |
| Gemini 3.1 Pro | $2.00 | $12.00 | $0.20 |
| GPT-5.5 | $5.00 | $30.00 | $0.50 |
| GPT-5.4 | $2.50 | $15.00 | $0.25 |

## Model to Provider Mapping

| Model | Go Available | Zen Available | Go ID | Zen ID |
|---|---|---|---|---|
| deepseek-v4-flash | ✅ | ✅ | opencode-go/deepseek-v4-flash | opencode/deepseek-v4-flash |
| deepseek-v4-pro | ✅ | ✅ | opencode-go/deepseek-v4-pro | opencode/deepseek-v4-pro |
| kimi-k2.6 | ✅ | ✅ | opencode-go/kimi-k2.6 | opencode/kimi-k2.6 |
| kimi-k2.5 | ✅ | ✅ | opencode-go/kimi-k2.5 | opencode/kimi-k2.5 |
| glm-5 | ✅ | ✅ | opencode-go/glm-5 | opencode/glm-5 |
| glm-5.1 | ✅ | ✅ | opencode-go/glm-5.1 | opencode/glm-5.1 |
| mimo-v2.5 | ✅ | ✅ | opencode-go/mimo-v2.5 | opencode/mimo-v2.5 |
| mimo-v2.5-pro | ✅ | ✅ | opencode-go/mimo-v2.5-pro | opencode/mimo-v2.5-pro |
| minimax-m2.5 | ✅ | ✅ | opencode-go/minimax-m2.5 | opencode/minimax-m2.5 |
| minimax-m2.7 | ✅ | ✅ | opencode-go/minimax-m2.7 | opencode/minimax-m2.7 |
| qwen3.6-plus | ✅ | ✅ | opencode-go/qwen3.6-plus | opencode/qwen3.6-plus |
| qwen3.5-plus | ✅ | ✅ | opencode-go/qwen3.5-plus | opencode/qwen3.5-plus |
| claude-opus-4.6 | ❌ | ✅ | — | opencode/claude-opus-4.6 |
| claude-sonnet-4.6 | ❌ | ✅ | — | opencode/claude-sonnet-4.6 |
| gemini-3.1-pro | ❌ | ✅ | — | opencode/gemini-3.1-pro |
| gpt-5.4 | ❌ | ✅ | — | opencode/gpt-5.4 |
| gpt-5.5 | ❌ | ✅ | — | opencode/gpt-5.5 |

## Past Benchmark History (from bak file, May 9 2026)

Top performers from the user's own codeneedle benchmark:

| Model | Pass Rate | Accuracy | Avg Latency | Endpoint |
|---|---|---|---|---|
| qwen3.6-plus (go) | 100% | 100% | 52.5s | Go |
| qwen3.6-plus (zen) | 100% | 100% | 57.9s | Zen |
| glm-5 (go) | 100% | 99.5% | 27.7s | Go |
| kimi-k2.6 (zen) | 100% | ~95% | ~10s | Zen |
| deepseek-v4-flash (go) | 100% | 99.5% | 80.6s | Go |

### Key Findings from Past Benchmarks

- **kimi-k2.6** needs `prefill_no_think=true` to suppress excessive CoT
- **deepseek-v4-flash** needs 24k max_tokens to avoid empty responses
- **deepseek-v4-pro** is impractically slow (~5-10 min/query)
- **minimax-m2.5** and **minimax-m2.5-free** are broken (API malformed responses)
- **nemotron-3-super-free** is unstable (intermittent failures)
- **big-pickle** is experimental, not production-ready
