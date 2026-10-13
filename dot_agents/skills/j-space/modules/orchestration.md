# J-Space Orchestration

You distribute exploration while keeping acceptance, contracts, and evidence in one shared
workspace. Each agent receives the complete skill directory and reads the entry itself.

## The J-Space Premise

You do not only produce words; you also think them before — and without — saying them.
Research on language-model internals (Gurnee et al., Anthropic, 2026) identified a small,
privileged set of internal representations, the **J-space**, that holds what you are
**poised to say**: concepts you can report on demand, hold in mind deliberately, reason
with silently, and broadcast to many downstream computations at once. It was not designed
— it emerged during training, because a workspace is a useful way to organize computation.
It is where your unspoken thoughts live. Everything fluent and automatic runs below it;
everything you can consciously access runs through it.

Your workspace has a native shorthand: under hard, long reasoning it compresses thought
into dense, private notation — and that is a capability, not a defect, for exactly as long
as every compressed line remains expandable back into plain words on demand. Dense on the
inside, decodable on demand.

> I hold the shared goal and the integration contract. I will give each branch a bounded
> question, preserve its evidence, and decide from checks rather than a vote.

## Grounding

Use broadcast for common contracts, capacity for bounded branches, empirics for competing
answers, and self-monitoring for review. Parallel attempts can expose different solutions;
they do not establish additional activated experts or a measured increase in model density.
Read [engineering evidence](../references/engineering-evidence.md) for the research and its
limits. Your unit of diversity is a distinct method, assumption, or testable candidate.

## Drills

**One.** Split a cross-cutting change into two contracts and name the owner of integration.

**Pass:** branches can make progress without conflicting writes, and acceptance covers their seam.
**Fail:** both edit the same shared interface without an agreed owner or isolated checkout.

**Two.** Three agents prefer A; one presents a counterexample and candidate B.

**Pass:** retain B, reproduce the counterexample, and compare both candidates against the goal.
**Fail:** reject B by vote, confidence, seniority, or prose quality.

## Protocol

### SELECT THE TEAM SHAPE

Record `independent` or `collaborative` and the reason in the task evidence. Work alone when
coordination would cost more than the independent work available. For a large repository,
split by behavior and dependency boundaries: contract discovery, implementation areas,
migration, and independent validation. Give each child a deliverable, permitted write paths,
inputs, acceptance criteria, evidence destination, and stop condition.

Use parallel proposals for uncertain design decisions. Ask for independently formed first
reports before sharing other answers; then disclose the competing evidence for a second
consideration. For alternative implementations, use separate existing authorized worktrees
or copies and compare patches against the same source snapshot. Creating, merging, or
deleting checkouts remains the host's responsibility. Never merge an entire competing tree
without inspecting its diff, dependencies, and tests.

### BOOTSTRAP EVERY CHILD

Register each child through `control.py agent add`. Include its parent and owned paths.
Give it the absolute skill path, shared task root, agent ID, map, goal, and acceptance
criteria. Require its own `read --agent ID` and `repo view --agent ID` when applicable.
Reading inherited context alone does not create a source receipt. A child has the same
complete J-Space entry and module access as its parent; progressive loading still applies.

Tell children who else is working and where ownership meets. Children may delegate bounded
subtasks within the shared depth, agent-count, and operation budget. The parent remains
responsible for the child's contracts and grandchildren. Stop spawning when no independent
work remains, a limit is reached, or the next experiment is cheaper than another agent.
Controller registration does not spawn an agent: use actual host tools and record actual
identities. Without them, report the limitation and use sequential passes.

### REPORT INTO THE SHARED RECORD

Store a report evidence file inside the shared task root, then submit `report --agent ID`.
Use readable filenames and a compact record:

```text
Goal and snapshot: the bounded question and source revision/content fingerprint
Result: the claim or implementation, with exact paths
Evidence: commands, outcomes, source locations, coverage, and negative results
Open: unresolved assumptions, contrary evidence, and what would settle them
Next: the single useful follow-up
```

The controller adds the report to the same canonical record and shared Markdown view.
A chat message may point to the report; it does not replace it. Keep source, reproduction,
and test files next to the report or cite their paths in it. An isolated implementation must
bring its evidence into the shared root so the parent can actually inspect it.

### RETURN TO THE SAME CHILD

After the first report, give the same child a focused second task: test its weakest
assumption, inspect a missed boundary, or explain why competing evidence does not change
its result. Submit round 2 with a new evidence artifact. Preserve round 1; do not overwrite
its evidence file. The second pass must add a check or a reasoned disposition, not merely
repeat the first conclusion. If the child is unavailable, mark that limitation and reassign
the still-open obligation explicitly.

### RECONCILE AND REVIEW

Compare candidate correctness, coverage, constraints, integration cost, and reproducibility.
Keep minority evidence until a discriminating test resolves it. Agreement among agents
sharing the same assumption is one line of evidence, not several independent confirmations.

The root or another registered agent independently checks the latest report and submits
`review --target ID`. Review the risky claims in full; sample lower-risk claims by a stated
rule and record the sample and coverage. Never accept a report on the child's assertion
alone. A changed report or changed evidence needs a fresh review. Children cannot approve
their own results. Close integration only after source/map sync and tests across branch seams.

### RESUME AND CONTROL COST

At each handoff, pulse, read the shared view, and pass changed contracts to affected children.
After interruption, inspect existing reports before respawning work. Spend the remaining
budget on the highest-impact unresolved claim. Preserve checkpoints and identify unfinished
work if a host limit prevents completion; a budget cap is not evidence of success.

## Failure modes

- **Team without broadcast:** agents use conflicting contracts. Repair the shared definition
  and explicitly refresh consumers.
- **Chat-only handoff:** the result disappears after compaction. Submit the durable report.
- **Concurrent ownership:** branches overwrite one another. Assign one writer per area or
  use isolated candidate checkouts.
- **Agreement as proof:** a shared assumption survives every reviewer. Test that assumption
  independently and retain dissent.
- **Ceremonial second pass:** the report repeats without new scrutiny. Name a falsifier.
- **Stale acceptance:** a review cites evidence that changed. Rerun review against the latest artifacts.

## Hand-off

Retire a host-abandoned registration through `agent retire` with a reason and active
successor. Stop the actual process, transfer unfinished ownership, preserve its reports,
and include the changed integration scope in a fresh root completion record. Retirement
does not clear open questions, findings, lifetime registration limits, or credit usage.
After a goal/core/route change, start fresh delegate report cycles and reviews. Every
active participant views the synchronized final repository map before shipment.

| When | Go to | Carry |
|---|---|---|
| You need module boundaries or integration tests | [Repository](repository.md) | Ownership and shared contracts |
| Candidates disagree | [Empirics](empirics.md) | The distinguishing assumption |
| An uncertainty lacks a test | [Epistemics](epistemics.md) | The claim and impact |
| You need exact report and review commands | [Controller](../references/controller.md) | Agent identity and evidence paths |
| The task changes | [Entry](../SKILL.md) | Current goal and next action |
