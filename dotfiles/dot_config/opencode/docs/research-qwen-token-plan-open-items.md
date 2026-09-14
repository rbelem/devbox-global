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
