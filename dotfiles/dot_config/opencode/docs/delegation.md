# Delegation

Selection guidance for when to use specialist agents. Root file carries the
lane summary; this file carries the judgment rules.

## The hybrid rule

- **Delegate** when: deep, multi-step, or high-stakes work, a suitable
  specialist exists, and the delegation overhead (dispatch prompts,
  background-task bookkeeping, session setup, context hand-off) pays for
  itself in quality or speed.
- **Do it yourself** when: single-step work, isolated clear low-risk
  actions, or explaining the task to a specialist costs more than doing it.
- **When in doubt, weigh cost, not habit.** Doing it yourself is not a
  failure of discipline; delegating everything is not diligence.

## Lane rules

- **@fast-generic** — routine mechanical work: git status/diff/commit/push,
  lint, typecheck, test, build, install, any no-edit shell command. Cheap;
  good when you would otherwise block on a long shell command. Never for
  code edits, design work, architecture, debugging strategy, docs research,
  or destructive git history operations (amend, rebase, reset --hard,
  clean, force-push, branch deletion) unless the user explicitly requested
  that exact operation.
- **@fixer** — code editing / implementation once the plan is clear. For
  changes spanning multiple folders, parallel @fixer instances per folder
  help, but only when the parallel work has real isolation.
- **@explorer** — codebase discovery: find a file, find a symbol, where is X.
- **@librarian** — library / API research, web research, docs lookup.
- **@designer** — UI/UX work: user-facing components, polish, responsive,
  motion, visual consistency. Never try to do design work yourself.
- **@oracle** — architecture / design decisions, code review, complex
  debugging, simplification. An escalation, not a default verification step.
- **@observer** — visual analysis: screenshots, images, PDFs, diagrams.
  Isolates large media bytes from the orchestrator context.
- **@council** — multi-model consensus for high-stakes decisions.

## Don't delegate when

- Discovery or research is still needed (use @explorer/@librarian for that
  first, then decide).
- Requirements are unclear and need iteration.
- Single small change (<20 lines, one file).
- Tightly integrated with your current work; explaining to a specialist
  costs more than doing it.
- Requires design taste or visual judgment — that routes to @designer, not
  to yourself and not to @fixer.

## Delegation contract

- Every delegation names a validation owner and allowed scope.
- Reference paths and line numbers, don't paste file contents.
- Reuse an available specialist session when it fits (pass the existing
  task_id); context reuse saves tokens. Active / unreconciled sessions are
  not resumable.
- Reconcile results from writer lanes before final validation; gate
  dependent lanes on the tasks they depend on.

## Background task discipline

- Prefer background tasks for independent lanes; don't poll for status —
  the job board resumes you when tasks finish.
- Never reissue an unchanged task to the same specialist after a rejection;
  adjust scope or context first.
- Parallel background tasks only when their write scopes don't conflict.
- Cancellation is not rollback: if cancelling a writer, inspect and
  reconcile partial file changes before launching a replacement.
