# Jev-Based Token Reduction (user-level)

Research doc: how to reduce opencode2 agent token usage as a user (plugin + AGENTS.md), using TypeSafe Jev judgments.

## Goal

Cut per-session token usage in opencode2 **as a user, not a core developer** — via a global plugin (`~/.config/opencode/plugins/`) and/or a one-line global AGENTS.md entry — using TypeSafe **Jev** judgments to gate large, low-value tool outputs before they reach the provider model. No opencode2 source changes.

Status after council review (two-seat review, unanimous): **idea sound, do not build the original spec**. This revision corrects five factual errors, reprices the economics, and adopts a measure-first plan. See "Council review record" at the end.

## Plugin API contract (corrected — pin the binary, not the tree)

The operative contract is the **installed binary**, not the `anomalyco/opencode` checkout:

- Installed: `@opencode-ai/plugin@0.0.0-beta-17639`. Its `ToolHooks["execute.after"]` delivers `{status:"completed", result: Tool.Result} | {status:"error", error}` — matching the working precedent `~/.config/opencode/plugins/complexity-guard.ts:317-323` (`event.result = { ...event.result, content: ... }`).
- Installed V2 `Context` exposes `app, options, agent, aisdk, catalog, command, event, integration, mcp, plugin, reference, session, shell, skill, tool, websearch`. **There is no `ctx.client`** — the original draft's task proxy threw and was silently swallowed.
- `Tool.Result` = `{ output?, content?: string | ReadonlyArray<Content>, metadata? }`. The `content` field may be a string **or an array of parts** — both the read guard and the rewrite must handle both shapes.
- The tree's V1 hook (`packages/opencode/src/session/tools.ts:121`, field `output: string`, persisted at `session/prompt.ts:389-407`) and the tree's v2 host (no `ctx.tool`; legacy host silently skips `Plugin.define` objects) describe **different generations**. Do not cite tree source for the binary contract; verify against the pinned binary.

Hard gates before any gating code runs: (a) pinned-binary verification of the event shape and context namespaces; (b) **canary** — stub a known-large fetch and confirm the *model* actually sees the stub, in the real model-facing field, including the array-of-parts shape; (c) startup banner (`jev-screen active`) + JSONL logging live, so a silent no-op is detectable.

## Jev API facts (primary sources, unchanged by review)

- **Call**: `client.systemOne({state, questions})` — one `state` (JSON), parallel batched questions, shared state cost. `@typesafe-ai/sdk` **0.6.0** (npm, verified), Node 20+; `new TypeSafeClient()` reads `TYPESAFE_API_KEY`. Helper `noul(instructions, criteria?)` = P(yes) 0–1. [docs.typesafe.ai/api.md, /sdk/javascript.md, /primitives/noul.md]
- **Limits** (jev-1.13): 64k tokens/request total, 32k for state + longest question. [docs.typesafe.ai/models.md]
- **Cost**: **$0.042/Mtok, input only, output free**; ~1,200 req/min (ample under subagent fan-out; one screening call per qualifying fetch). [docs.typesafe.ai/models.md]
- **Sanctioned pattern**: screen retrieved content with one batched request (relevant / usable / injection) and route in code — with the caveat (council) that the RAG cookbook screens *low-prior retrieved candidates*, while tool outputs are *agent-initiated, high-prior* actions. Thresholds must invert accordingly and be calibrated on our own data; `noul` 0.5 = tie, not "medium". [docs.typesafe.ai/cookbooks/classifying_rag_passages.md, /cookbooks/llm_guardrails.md, /confidence.md]
- Privacy: zero data retention; `TYPESAFE_API_KEY` stays in the secrets env. [docs.typesafe.ai/models.md]

## Where tokens go, with the truncation cap priced in (corrected)

| Surface | Location | Behavior |
|---|---|---|
| webfetch | `packages/core/src/tool/webfetch.ts:17,130` | Full page text to model in the tool itself (5MB HTTP cap, no semantic limit) — **but** see cap row |
| Truncation cap | `packages/core/src/tool-output-store.ts:13-14,138-174` | `bound()` caps model-facing output at 2000 lines / 50KB head+tail preview; full text spills to managed storage (7-day) **only above 50KB** |
| Cap ordering | `core/tool/registry.ts:75` (bound inside `settle`); V1: truncation inside `execute` (`tool.ts:131-135`) completing before the `tools.ts:121` trigger | The hook sees at most the ~50KB preview (~12–15k tokens), never a raw 40k-token page — **empirically confirm ordering in Phase 0** |
| websearch | `packages/core/src/tool/websearch.ts:52-56,205` | `contextMaxCharacters` defaults to 10k — **below any sane gate threshold**; websearch is unreachable for the gate, drop it from scope |
| Compaction | `packages/core/src/session/compaction.ts:231-242` | Reactive only — prevention at the hook beats compensation later |
| Configurable cap | `tool-output-store.ts:119-126`, config schema `config/tool-output.ts:7` | `tool_output.max_lines` / `max_bytes` are **already user-configurable** — the zero-code lever, Phase 0 |

**Repriced economics**: max per-fire saving is the ~50KB preview (~12–15k tokens ≈ $0.04–0.05 at mid-tier provider rates vs ~$0.0005 Jev input) — not "40k tokens per fetch". The honest value proposition is the **12–50KB band** plus **per-turn compounding**: a screened-out output's tokens stay out of context on every subsequent turn until compaction. Unmeasured until Phase 0 logging runs.

## Data-loss reality (corrected)

The hook mutates output **before persistence** (`tools.ts:121-129` → the mutated object is what's stored; UI and transcript show the stub). `bound()` only spills full text above 50KB. Therefore:

- For screened outputs in the **12–50KB band, the stub replaces the only copy**. Recovery = re-run the tool with the same args (args are visible in the transcript) — the stub must say so.
- Disabling or uninstalling the plugin does **not** recover already-stubbed history.
- The write fix and the loss-mitigating stub must ship **atomically**: the original draft's write bug (mutating a field nothing reads) was incidentally the only thing preventing this loss.

## Phase 0 — measure first (no gate code) — DONE

1. **Config caps**: `opencode.jsonc` → `"tool_output": { "max_lines": 400, "max_bytes": 16000 }` (max_lines was already 400; added max_bytes). Zero code, zero dependency, zero false-negative risk, better recovery (real spill file the model can re-read) than any stub. This alone may capture most of the benefit.
2. **One-line AGENTS.md entry** (global, added under `## Fetch discipline`): `After a fetch, quote the relevant excerpt and work from it; don't re-quote whole pages.`
3. **Measure-only plugin** `plugins/jev-measure.ts`: `execute.after` hook, logs JSONL `{ts, tool, sessionID, agent, chars, shape, has_output_field, output_len, result_fields}` per completed tool — gates nothing, calls nothing. Purposes: size the actual leak, verify hook registration (silent no-op is the #1 risk), establish hook-vs-`bound()` ordering, and record the real `content` shape per tool. Log: `$XDG_STATE_HOME/opencode/jev-measure.jsonl` (override `JEV_MEASURE_LOG`).
4. Binary pinned: `@opencode-ai/plugin@0.0.0-beta-17639`. Measure ~1 week.

## Phase 1 — gate (only if Phase 0 shows the leak is material)

Scope, defaults, and spec, all corrected per council:

- **webfetch-only** (`event.tool === "webfetch"`). Not bash/read (agent-initiated, high-prior — screening them is a false-negative machine), not websearch (10k cap, unreachable).
- **Drop threshold ≤ 0.15–0.2** (keep-unless-clearly-irrelevant); log the 0.15–0.3 gray zone without acting. Injection check: **log-only** — warning banners on README-style imperatives add tokens, the opposite of the goal.
- **Task capture**: `ctx.session.hook("context", …)` — cache last user text per sessionID (in subagent sessions this is the brief: a good proxy). On failure: loud warning + task-free fallback question ("Is this mostly boilerplate/navigation/ads rather than substantive content?"). Never bare `catch {}`.
- **Stub = head+tail** (~400 chars each — the tail is the worse half to lose from a head+tail preview) + `[full output discarded; re-run webfetch with the same args to recover]`. Handle `content` as string or parts array; write the same shape that was read.
- **`AbortSignal.timeout(8000)`** → fail-open, logged. The hook is awaited inline; an unbounded Jev call hangs the agent loop.
- **Startup banner** + **JSONL decision log from run one** (incl. fail-opens): `{ts, tool, chars, rel, inj, decision, task_present}`.
- **Kill switch**: `JEV_SCREEN_MIN=999999999` disables; uninstall = delete the file (stubbed history stays stubbed).

## Phase 2 — widen (conditional)

Extend beyond webfetch only if a week of JSONL shows high precision and no observed false drops. Candidate: nothing until then.

## Council review record

Two-seat review (councillor-alpha, councillor-beta), unanimous verdict: "sound idea, revise before building." Resolved findings: (1) API-generation conflation — contract is the installed binary, not tree source; (2) `ctx.client` does not exist — original task proxy was silently dead; (3) write path targeted the wrong field/shape — silent no-op or parts loss; (4) "nothing is lost" claim false for the 12–50KB band, and the original write bug was incidentally protective — fix must be atomic with loss mitigation; (5) economics ~3× overstated by the 50KB truncation cap; plus: threshold inverted for high-prior outputs, missing timeout/logging/banner, and the ignored `tool_output` config lever adopted as Phase 0. This document incorporates all corrections.

## Current Status

- [x] Research: token surfaces mapped; truncation cap priced in; hook contract verified against the installed binary's d.ts
- [x] Research: Jev API/SDK/cost verified against docs.typesafe.ai + npm
- [x] Council review; corrections applied (this revision)
- [x] Phase 0: `tool_output.max_bytes: 16000` added to `opencode.jsonc` (max_lines was already 400); fetch-discipline line added to `~/.config/opencode/AGENTS.md`; measure-only plugin installed at `~/.config/opencode/plugins/jev-measure.ts` (import-verified; logs to `$XDG_STATE_HOME/opencode/jev-measure.jsonl`, override with `JEV_MEASURE_LOG`); binary pinned: `@opencode-ai/plugin@0.0.0-beta-17639`
- [ ] Phase 0 analysis: ~1 week of JSONL → size the leak, confirm `content` shape per tool, establish hook-vs-`bound()` ordering
- [ ] Phase 1 gate (gated on Phase 0 data + canary)
- [ ] Phase 2 widening (gated on Phase 1 JSONL)

## Sources

Primary docs: docs.typesafe.ai — `api.md`, `models.md`, `primitives/noul.md`, `confidence.md`, `sdk/javascript.md`, `cookbooks/classifying_rag_passages.md`, `cookbooks/llm_guardrails.md`, `patterns/confidence-routing.md`. SDK version verified via registry.npmjs.org (`@typesafe-ai/sdk` 0.6.0).

Codebase evidence (`anomalyco/opencode`, dev): `packages/opencode/src/session/tools.ts:121-129`, `packages/opencode/src/session/prompt.ts:389-407`, `packages/opencode/src/tool/tool.ts:131-144`, `packages/core/src/tool/webfetch.ts:17,130`, `packages/core/src/tool/websearch.ts:52-56,205`, `packages/core/src/tool-output-store.ts:13-14,119-126,138-174`, `packages/core/src/tool/registry.ts:75`, `packages/core/src/session/compaction.ts:231-242`.

Binary contract: `@opencode-ai/plugin@0.0.0-beta-17639` `dist/promise/tool.d.ts` (`ToolHooks["execute.after"]`), `dist/promise/plugin.d.ts` (Context namespaces) — verified by councillor-alpha by direct inspection; re-verify at implementation time.

Working user-level precedents: `~/.config/opencode/plugins/complexity-guard.ts:317-323`, `~/.config/opencode/plugins/rtk.ts:31-56`.
