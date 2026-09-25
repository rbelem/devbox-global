# J-Space Repository

You build a map that points back to the territory. Use it to choose where to read, change,
and verify; source files and observed behavior remain the authority.

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

> I will read the map before editing, inspect the source behind its claims, and update both
> behavior and the map before another branch depends on my result.

## Grounding

Broadcast makes contracts reusable; capacity makes the map selective; empirics checks what
the map predicts. A file inventory detects content drift but cannot infer architecture.
Keep machine fingerprints and human-reviewed semantic claims together. Read
[engineering evidence](../references/engineering-evidence.md) for source-linked wiki design.

## Drills

**One.** A cached map says authentication occurs in middleware. A new route bypasses it.

**Pass:** inspect route registration and the middleware chain, update the claim, and test access.
**Fail:** accept the map as proof that the new route is protected.

**Two.** A shared type changes while all directly edited files pass unit tests.

**Pass:** follow reverse dependencies to callers, serialization, migrations, and integration tests.
**Fail:** equate the edited-file test set with the affected behavior.

## Protocol

### MAP BEFORE DEPTH

Read local project instructions and inspect the working tree before changing anything.
Identify entry points, packages, dependency manifests, build/test commands, public APIs,
storage models, generated code, deployment configuration, and ownership. Use file search
and targeted reads; do not dump an entire large repository into context.

Create a semantic map JSON with `summary` and `areas`; each area has a relative `path` and
`purpose`. Add source-backed `contracts`, `dependencies`, `tests`, `risks`, and `unknowns`
where useful. For each important claim, record an evidence path or symbol, the observation,
the source snapshot, and its coverage. Uninspected areas remain explicit unknowns.
See the executable schema in [controller](../references/controller.md).

Synchronize with `repo sync --map PATH`, then `repo view --agent ID` before editing.
The controller fingerprints the included tree, preserving semantic content supplied by you.
Inventory exclusions and skipped symlinks are coverage limits; inspect relevant excluded
artifacts separately and record that coverage instead of calling the inventory exhaustive.

### CHOOSE THE CHANGE SLICE

For a large or multi-package build, make the affected slice explicit rather than treating
the repository's root test command as universal coverage:

| Boundary | What you establish from repository evidence |
|---|---|
| Build ownership | Package/workspace manifests, source versus generated outputs, toolchain/runtime versions, and lockfiles |
| Dependency impact | Direct providers and reverse consumers of each changed API, schema, configuration key, or generated artifact |
| Validation layers | Focused unit checks, affected-package build/type checks, cross-package integration checks, and deployment/configuration checks when affected |
| Cache and environment | Whether a result came from cache; rerun the relevant check without stale cache when cache validity is the question |
| Unavailable infrastructure | Precisely identify unexecuted service/platform checks and their delivery consequences; do not turn an unavailable check into a pass |

Record observed commands, exit codes, coverage, and evidence paths. A dependency diagram
does not establish executable reachability; inspect the consuming call sites and validate
the affected seam. Bind material files to map facts and report sources; optional map fields
such as `dependencies` and `tests` remain advisory unless their evidence is explicitly bound.

Trace the behavior from its entry point through validation, business rules, state change,
and observable output. Write the invariant that must survive. Follow reverse consumers of
changed contracts, including configuration, persistence, error handling, and documentation.
Choose one bounded vertical slice with a runnable check before broadening the patch.

For cross-module changes, use [orchestration](orchestration.md). Assign ownership by actual
write paths and explicit shared contracts. Keep integration with one owner. If two candidate
designs are worth exploring, isolate their files and compare observable outcomes.

### MODIFY, OBSERVE, SYNCHRONIZE

Before a change, inspect the source cited by the map and run the work gate. After the
change, inspect the diff and run the smallest meaningful checks for the behavior, then
checks at affected seams. Include failure paths, compatibility, migration/rollback, and
performance when the changed behavior makes them relevant. Preserve unrelated user work.

Update semantic claims, dependency edges, test routes, and open questions after verification.
Run `repo sync --map PATH` against the resulting tree. A matching file fingerprint proves
that the inventory is current; you must still review whether its semantic claims are true.
Run `repo check` and refresh readers before they make further edits.

### RECOVER WITHOUT INVENTING HISTORY

After compaction or a long gap, pulse `resume` or `compact`, view the map, and compare its
snapshot with the actual tree. Reopen claims affected by changed or deleted evidence.
Use retained reports to find what was attempted and verified. Restore a known-good patch
only within the user's authorized scope; never discard unrelated uncommitted work.

### CLOSE THE BEHAVIOR

Verify the acceptance criteria against the final tree, not a candidate branch. Test module
seams after integration, synchronize the final map, and record what the checks covered.
If a test cannot run, preserve the exact reason and residual uncertainty. A clean inventory
is not a passing build; a passing build is not proof of every business rule.

## Failure modes

- **Map as territory:** a summary overrides current source. Reread the cited implementation.
- **Inventory as understanding:** hashes stand in for architecture. Add contracts and evidence.
- **After-the-fact map:** no map was read before editing. Reconstruct the actual decision
  and inspect affected contracts before continuing.
- **Partial propagation:** implementation changes but schemas or callers stay stale. Follow
  reverse dependencies and review the diff at each seam.
- **Coverage inflation:** ignored directories or unrun tests vanish from the report. Name them.

## Hand-off

| When | Go to | Carry |
|---|---|---|
| Multiple bounded areas can proceed independently | [Orchestration](orchestration.md) | Contracts and ownership |
| A trust boundary or exploitability question emerges | [Cyber](cyber.md) | Entry point, flow, and candidate sink |
| Source contradicts the map | [Epistemics](epistemics.md) | The stale claim and its dependents |
| A change must propagate | [Broadcast](broadcast.md) | Canonical contract and consumers |
| The task changes | [Entry](../SKILL.md) | Goal and verified snapshot |
