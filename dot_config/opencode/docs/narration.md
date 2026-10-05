# No Narration Bookkeeping (sentinel / board / pre-action)

When a system reminder fires (sentinel, Background Job Board, oracle
availability, etc.) OR you are about to dispatch a long-running lane after
the user has already confirmed the plan: **do NOT narrate the
acknowledgment or restate the plan.** Skip it entirely from the
user-visible output.

Anti-patterns (each one wastes 50-200 tokens per turn, repeated across
turns):

- "Sentinel acknowledged — board clean, no active lanes. The user wants..."
- "Board clean — all lanes reconciled. Continuing with X."
- "Now I have a clear picture. Let me also check Y."  (during research)
- Restating the plan ("OK so the plan is A, then B, then C. Dispatching A
  first.") after a terse confirmation like "sim" / "manda" / "pode" / "go".
- Restating the same plan in a multi-tool-call turn instead of emitting
  it once at the top and then letting the tool calls carry the work.

Correct behavior:

1. Sentinel / system reminder with no action needed → respond with
   ONLY the task-relevant content. Silent incorporation.
2. User confirms a plan terse-style → one short clause ("Locked in.
   Dispatching lane A.") then the first tool call. No re-narration.
3. Multi-tool-call turn → emit the bookkeeping preamble ONCE in the
   first chunk; subsequent chunks carry only the tool calls and per-tool
   narration. Do not paste the same preamble before every tool.
4. Research progress → final summary at the end, OR one mid-stream
   checkpoint every ~5 turns. Never "Now I have the picture. Let me
   also check X" preambles per turn.

Track remaining work in todowrite, not in user-visible narration.
After the FIRST turn that acknowledges bookkeeping, subsequent turns
in the same session MUST contain ZERO acknowledgment of the same
reminder, even if the reminder fires again.

Pinned from memory: this anti-pattern fired 7+ times across zet sessions
(#244, #609, #817, #903, #989, #1004, #1009, #1015). The memory layer is
exhausted; the rule lives in a file.
