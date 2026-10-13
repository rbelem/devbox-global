# Engineering Evidence

Use this reference to separate measured findings from the protocols you execute. Read
[the scientific reference](j-space-science.md) for the suite's canonical J-space terminology.
The primary sources below were inspected on 2026-09-12. Repository documentation is a
moving source; preserve the version, benchmark, and conditions when you reuse a result.

## 1. Internal workspace and external control

**Evidence.** Gurnee et al. identify verbalizable representations with causal roles in
report, modulation, reasoning, and broadcast. Their ablation experiments show stronger
effects on multi-hop reasoning than on shallow classification. Explicit intermediate
steps make GSM8K performance more robust to the intervention. The authors interpret this
as moving information otherwise held internally onto the page. The study does not establish
that a Markdown skill directly reads, writes, or enlarges neural activations.
[Paper](https://transformer-circuits.pub/2026/workspace/index.html),
[companion code](https://github.com/anthropics/jacobian-lens).

**Engineering inference.** Keep the active goal and next decision small; persist evidence,
assumptions, and pending work outside transient context. Reintroduce that state at task
boundaries. Treat the ledger as an inspectable control surface, not as a measurement of
internal J-space. Record concise conclusions and observable evidence; you do not need to
expose private reasoning traces. Validate the protocol by task outcomes, not by claims
that you felt a workspace activate.

## 2. The four kinds of unknown

**Evidence.** Thariq Shihipar's Anthropic field guide distinguishes the specification from
the actual codebase and constraints, then names four categories:
"Known Knowns", "Known Unknowns", "Unknown Knowns", and "Unknown Unknowns".
It recommends discovering gaps before, during, and after implementation through blind-spot passes and interviews,
prototypes, implementation notes, and explainers. This is practitioner guidance, not a
controlled evaluation of a four-quadrant controller.
[Field guide, July 6, 2026](https://claude.com/blog/a-field-guide-to-claude-fable-finding-your-unknowns).

**Engineering inference.** Give each material uncertainty an action:

| Category | What you record | What you do |
|---|---|---|
| Known known | Requirement or observation with provenance | Check that its evidence is current |
| Known unknown | A specific unresolved question | Assign an owner and a decisive check |
| Unknown known | A tacit convention or preference you discover | Confirm it from examples or the user, then write it down |
| Unknown unknown | A blind-spot search area | Inspect boundaries and counterexamples; reclassify discoveries |

Do not claim to enumerate all unknown unknowns. A map represents inspected knowledge;
the source and observed behavior can invalidate it at any time.

## 3. Sampling and verification

**Evidence.** The project matching the Stanford/DeepSeek lead is
**LLM-as-a-Verifier**, with Stanford, UC Berkeley, and NVIDIA affiliations on its
[project page](https://llm-as-a-verifier.com/). Its
[paper](https://arxiv.org/abs/2607.05391) describes score-token probability expectations,
repeated evaluation, and decomposition into criteria. These are specific mechanisms;
ordinary text scores are not equivalent to token-logprob expectations.

The authors' [repository](https://github.com/llm-as-a-verifier/llm-as-a-verifier#self-verification-terminal-bench-21)
reports DeepSeek V4 Flash on Terminal-Bench 2.1, using five candidate trajectories and
the same model as verifier: Pass@1 78.7%, selected result 88.0% ± 0.6%, oracle 96.6%.
These are author-reported benchmark results, not results reproduced by this suite.
They support trying candidate generation with explicit verification; they do not establish
general superiority over Claude Fable 5, a stable cost ratio, or gains on every repository.

**Engineering inference.** For a contested, expensive decision, specify acceptance criteria
before generating candidates. Keep initial alternatives independent, preserve artifacts,
then compare correctness, evidence, integration cost, and regressions. Recheck promising
minority proposals. Run deterministic tests before relying on model judgments. Send the
same worker a focused second pass containing the unresolved objection or failed check.
If your host does not expose the required probabilities, describe your method as
criteria-based review; do not claim to implement the paper's probabilistic verifier.

## 4. Collaboration can dilute expertise

**Evidence.** Pappu et al. study self-organizing teams and report that teams can underperform
their best member. Their analysis links poorer performance to compromise between expert
and non-expert views. This finding concerns the tested interaction regimes; it does not
prove that all delegation fails.
[Apple research publication](https://machinelearning.apple.com/research/multi-agent-teams-experts),
[paper](https://arxiv.org/abs/2602.01011).

**Engineering inference.** Preserve disagreement until you resolve its factual basis. A vote,
model label, or confident voice cannot override a reproducing test or a source-backed
counterexample. Give workers bounded ownership and make their dependencies visible. Add a
worker only when it buys independent exploration, specialized checking, or useful concurrent
work. Compare extra coordination cost with the evidence it produces.

## 5. Repository memory with evidence versions

**Evidence.** [OpenWiki](https://github.com/langchain-ai/openwiki) maintains repository
documentation with claims tied to versioned source evidence. Its update lifecycle checks
stale claims and persists page progress. This is a concrete implementation precedent for
durable, source-linked memory. [DeepWiki-Open](https://github.com/AsyncFuncAI/deepwiki-open)
is a separate open-source repository-wiki project; [Cognition's DeepWiki](https://docs.devin.ai/work-with-devin/deepwiki)
is another product. Do not conflate their ownership or guarantees.

**Engineering inference.** Maintain a compact map of modules, entry points, data flows,
invariants, tests, and security boundaries. Attach file evidence and a content version to
claims. Before editing, inspect the relevant map and verify its source. After editing,
refresh affected claims and dependent relationships. A fingerprint detects drift; it
cannot establish semantic truth. Do not mark a regenerated summary verified until you
have inspected the relevant behavior. Prefer focused stale-entry updates to rebuilding
every page on each step.

## 6. Re-reading and timing

**Evidence.** Xu et al. report reasoning improvements from re-reading the question in
their tested prompting setup. This supports fresh input access as an experiment, but it
does not identify a universal refresh interval for long agent sessions.
[Re-Reading Improves Reasoning in Large Language Models](https://arxiv.org/abs/2309.06275).

**Engineering inference.** Trigger fresh reads after compaction, requirement changes,
handoffs, failed verification, and substantial changes to the working model. Combine those
events with a configurable upper bound on unchecked steps or elapsed time. Measure the
tradeoff between drift and repeated-input overhead. A script can emit source text and
reject missing acknowledgments when invoked; only a host hook can make invocation automatic.
Neither a digest nor an acknowledgment proves comprehension.

## 7. Neural analogies and the claim boundary

**Evidence.** The [DeepSeek-V3 technical report](https://arxiv.org/abs/2412.19437)
describes a mixture-of-experts model with 671 billion total parameters and 37 billion
activated per token. These are model architecture properties, not a budget that a skill
can allocate across agents.

**Engineering inference.** You may use sparse routing for selective document loading,
dense review for broad coverage, and residual memory for retaining unresolved evidence.
Treat these as software design analogies. Multiple agents or retries can explore different
outputs, but they may use overlapping internal experts and share the same mistakes.
You cannot infer distinct expert counts, increased parameter density, or a larger internal
workspace from the number of agents. Establish improvements through reproducible task
evaluation, evidence quality, regression coverage, and measured cost.

Use [self-monitoring](../modules/self-monitoring.md) to make uncertainty select an action,
and [empirics](../modules/empirics.md) to replace contested claims with observable checks.
