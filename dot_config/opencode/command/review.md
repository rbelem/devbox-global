Run a code review against the current staged or unstaged changes. Useful for a final pass after a non-trivial edit before commit.

## Usage

```
/review                                  → pick backend automatically (ask only if truly ambiguous)
/review ocr                              → force the open-code-review (`ocr`) CLI backend
/review oracle                           → force the @oracle agent backend
/review staged                           → scope: staged only (either backend)
/review unstaged                         → scope: unstaged only (either backend)
/review <file-path>                      → scope: one file (either backend)
/review commit <sha>                     → ocr only: `ocr review --commit <sha>`
/review from <ref> to <ref>              → ocr only: branch/range diff review
```

## Backend Selection

Pick the backend that fits the request; ask the user only when both fit equally and the choice matters:

- **`ocr`** (default for structured diff review) — working-copy/commit/range diffs in a git repo, when business context can be summarized in a sentence or two, when line-level structured findings (severity/category) are wanted, when the user wants a fast mechanical pass.
- **`@oracle`** — architectural/design review, multi-file cross-cutting concerns, no-git workspace or non-diff review targets, or when the user wants a verdict-style deep reasoning pass (CRITICAL/WARNING/NIT/VERDICT).

## Backend A: `ocr` (open-code-review CLI)

1. Gather business context: summarize what the change is for in 1-3 sentences → pass as `--background`.
2. Run the review (never pipe output through `tail`/`head`; use `--output` for large diffs and read the file in full):
   - Working copy: `ocr review --audience agent -b "<context>" [--output /tmp/ocr_out.txt]`
   - Single commit: `ocr review --audience agent -b "<context>" --commit <sha>`
   - Range: `ocr review --audience agent -b "<context>" --from <ref> --to <ref>`
   - Dry-run: `ocr review --preview`
3. Scope modifiers: `staged` → suggest `git add` semantics are included by default workspace mode covers staged+unstaged+untracked; if the user wants narrower scope, stage selectively or note the caveat. `unstaged`/`<path>` → use `--exclude` or preview first to confirm scope.
4. Report results grouped by severity (critical / high / medium), discarding `low` items that are nitpicks or likely false positives. Include `path:line`, category, brief description, and the recommendation.
5. Never modify code from `/review`. If the user then asks for fixes, focus on critical/high/medium and confirm before applying.

## Backend B: `@oracle` agent

1. Determine the diff scope:
   - staged → `git diff --cached`; unstaged → `git diff`; `<path>` → `git diff HEAD -- <path>` (also accept untracked file reads); default → `git diff HEAD`.
2. If no git repo or no diff, read the most recently modified files in the project root and review those.
3. Delegate to `@oracle` with the diff + the standard review checklist:
   - Correctness (logic, edge cases, off-by-one)
   - Security (injection, secrets, auth)
   - Performance (hot path, allocations, async)
   - Maintainability (naming, structure, tests)
   - Compatibility (breaking changes, schema)
4. Oracle returns a structured review:
   - **CRITICAL** — must fix before commit
   - **WARNING** — should fix, can defer
   - **NIT** — optional, taste
   - **VERDICT** — overall recommendation (ship / needs-changes / hold)
5. Surface Oracle's output verbatim. Do not summarize silently.

## Common Rules (both backends)

- This is a **read-only** review. Never modify code from `/review`.
- If CRITICAL findings present, suggest the fix and ask the user before applying.
- For a self-review of the agent's own work, follow up with `@oracle` directly after.
- For a multi-file architectural review, use `@oracle` with a scope document instead.
- `ocr` failures: if `ocr` is missing, install with `bun install -g @alibaba-group/open-code-review` (npm-free machine); if LLM errors occur, check `ocr llm test` — provider is custom `bifrost` (`http://127.0.0.1:8081/v1`, model `kimi-for-coding/k3`, dummy key). Requires the local Bifrost gateway to be running (app-dir `~/.config/bifrost`, port 8081). Direct Moonshot global key is suspended; direct z.ai coding-plan endpoint (z-ai-coding / glm-5.3) is the fallback provider if Bifrost is down. On HTTP 429 bursts, retry with `--concurrency 2`.
