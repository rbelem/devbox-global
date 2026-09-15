# Research: Qwen token plan open items

Date: 2026-09-14. Follow-up to the qwencloud (Alibaba Cloud Model Studio Token Plan) restore.
Scope: the four open items from the restore report. Method: live probes against the local
Bifrost gateway, primary-source code (maximhq/bifrost), and Alibaba Cloud official docs.

## 1. Does Bifrost forward `reasoning_effort` on the anthropic-base custom provider?

**Verdict: yes, converted into an Anthropic thinking budget.** Two independent proofs.

Code (`core/providers/anthropic/chat.go`, `ToAnthropicChatRequest`, dev branch):
effort-only requests take `MapBifrostEffortToAnthropic(effort)`, then for providers
without adaptive/native effort support:
`providerUtils.GetBudgetTokensFromReasoningEffort(effort, MinimumReasoningMaxTokens, maxTokens)`
produces `thinking: {type: "enabled", budget_tokens: N}`. `max_tokens` is kept strictly
greater than the budget. Adaptive-effort models get `thinking: {type: "adaptive"}` plus
effort on `output_config` instead. The drop-params plugin only removes reasoning when the
model datasheet marks it unsupported, which is not our case.

Live probes (gateway `localhost:8081`, model `alibaba-token-plan/qwen3.8-max`, hard problem
"smallest n with n! ending in exactly 2026 zeros"):

| reasoning_effort | reasoning chars | total output tokens |
|---|---|---|
| low | 2,388 | 2,365 |
| xhigh | 13,454 | 6,495 |

A trivial puzzle showed no difference at any effort. That is a ceiling effect, not a drop:
effort caps the thinking budget, simple problems stop early regardless.

`"xhigh"` (not a standard Anthropic level) passes through and produces a real budget
difference. Confirmed empirically, not just by reading the mapper.

Implication: variant selection on the bifrost route is trustworthy. The direct
`@ai-sdk/anthropic` provider block remains useful as a fallback route, not a fidelity fix.

## 2. Token plan terms: automation and data

From the official token plan pages (Personal and Team editions):

- Scope is "interactive use only within coding tools and agent tools". Automation scripts,
  application backends, and non-interactive batch calls are prohibited, with subscription
  suspension or API key banning as the stated penalty. This matches the earlier warning;
  scheduled/autonomous agent traffic is the exposure.
- Personal Edition: Singapore region, "Global" deployment mode, prompts and outputs cross
  borders. No ZDR or retention commitment found for either edition.
- The no-training guarantee is stated for Team Edition and for Model Studio PAYG generally
  ("never uses your data for model training", Model Studio FAQ), not for Personal Edition.

The old config comment claimed PAYG direct gives "contractual no-training, no persistence".
The no-training half is supported. The no-persistence half is unsupported by any primary
source found. Treat it as unverified.

## 3. qwencloud PAYG alternative

The original "fix" note in the slim config wanted gamma on PAYG direct. Status:

- Endpoint: `https://dashscope-intl.aliyuncs.com/compatible-mode/v1` with a regular `sk-`
  key. No PAYG key exists in `auth.json` today; only the plan key is configured.
- PAYG price for qwen3.8-max: $2.00 in / $6.00 out per 1M tokens (multiple secondary
  sources; verify on the official model pricing page before relying on it).
- Night discount (50% credits, 22:00-08:00 UTC+8, qwen3.8-max among others) applies to the
  token plan only, not PAYG.

Current gamma wiring (token plan via bifrost) is therefore the only working Alibaba-hosted
route without buying a second key.

## 4. Council seat diversity

`council.default` is now alpha `bifrost/zai/glm-5.3`, beta `bifrost/alibaba-token-plan/qwen3.8-max`,
gamma `bifrost/alibaba-token-plan/qwen3.8-max`. Beta and gamma are the same model via the
same host, so a three-seat vote is effectively two-seat. Options: move gamma to
`alibaba-token-plan/qwen3.8-flash` (same family, cheaper, weaker judgment) or to a Kimi
seat. Left as-is pending a decision.

## Sources

- maximhq/bifrost, `core/providers/anthropic/chat.go` (dev), fetched raw this session
- Live probes against localhost:8081, recorded above
- Alibaba Cloud Model Studio: token-plan-personal-overview, token-plan-team-overview,
  token-plan-overview, faq-about-alibaba-cloud-model-studio, model-pricing
- QwenCloud docs via kingy.ai Sep 2026 recheck (effort/budget interplay, preserve_thinking)

## 2026-09-14 addendum: parameter fix + council amendments

Diagnosis (bifrost logs.db, 633 calls/7d): all calls at reasoning_effort=xhigh
(262k budget), p90 latency 194s, 11 length-truncations at 32768 cap, 30x 429
(retries fired 4 attempts inside ~12s, all inside one quota minute), p50 prompt
131k (79% past 100k cliff). Council verdict: ship with amendments. Applied:

- oracle/designer/council.beta: xhigh -> medium (slim config)
- council.gamma: moved off Qwen entirely -> bifrost/deepseek/deepseek-v4-pro @medium
  (third vendor; alpha=Kimi, beta=Qwen).
  UPDATE 2026-09-15: reverted same day — user vetoed DeepSeek for council (privacy).
  Seat disabled; council runs 2-seat (alpha=Kimi, beta=Qwen) until qwencloud PAYG
  direct becomes the diversity seat after the token plan ends Sep 22.
- qwen3.8-max/flash xhigh variant cap 32768 -> 131072 (no mid-thought truncation);
  `max` variant deleted (unreferenced, identical to xhigh)
- direct anthropic provider default effort xhigh -> medium
- privacy preset designer k3 @high -> @xhigh (variant "high" never existed)
- bifrost alibaba network_config: max_retries 3->5, retry_backoff_max 5000->30000
  (span the quota minute); live config + chezmoi template synced
- variant-body audit: no effort+budget pairs, no penalties >0; no implicit-effort
  qwen paths remain

### preserve_thinking probe

Live probe via gateway (2-turn tool loop, OpenAI format): omitting historical
reasoning_content from the assistant tool-call turn is ACCEPTED by the endpoint
(both with/without answered correctly). Replay is NOT required on the
anthropic-compat route. Strip-plugin follow-up offered; not built (behavioral
risk: model loses prior reasoning chain). Historical share unmeasurable —
bifrost does not persist raw_request bodies for stream rows.

### Re-check procedure (run ~2026-09-21, one week after fix)

Same queries as the diagnosis against ~/.config/bifrost/logs.db, last 7d,
provider='alibaba-token-plan', model='qwen3.8-max', object_type='chat_completion_stream':

1. params histogram: expect `{"effort": "medium"}` dominant, xhigh ~0
2. stop_reason: length truncations = 0
3. latency p90: expect well under 194s
4. 429 error count: expect well under 30; verify retries=5 in attempt_trail spans
5. prompt_tokens p50 on NEW sessions: trending < 100k
6. spot-check one genuinely hard oracle task at medium; if quality dropped,
   rollback is oracle-only -> xhigh (opencode.jsonc variant + slim config)

Backups: opencode.jsonc.bak-20260914, oh-my-opencode-slim.jsonc.bak-20260914.
