---
name: gh-silent-failure-debug
description: |
  Debug pattern for scripts that call 'gh' (GitHub CLI) and silently fail, showing 'unknown' or empty results. Root cause is usually NOT 'gh not in PATH' but 'gh not authenticated'. Diagnostic chain: (1) verify 'which gh' shows it IS in PATH, (2) run 'gh auth status' to check authentication, (3) if 'not logged into any GitHub hosts', the fix is 'gh auth login' or setting GH_TOKEN env var. Watch for scripts that suppress gh errors via '2>/dev/null || true' — this swallows the auth failure silently. Applies to devbox-global update-flake and any script calling 'gh release list', 'gh api repos', etc.
created_by: autolearn
created_at: "2026-07-11"
---

# Gh Silent Failure Debug

Debug pattern for scripts that call 'gh' (GitHub CLI) and silently fail, showing 'unknown' or empty results. Root cause is usually NOT 'gh not in PATH' but 'gh not authenticated'. Diagnostic chain: (1) verify 'which gh' shows it IS in PATH, (2) run 'gh auth status' to check authentication, (3) if 'not logged into any GitHub hosts', the fix is 'gh auth login' or setting GH_TOKEN env var. Watch for scripts that suppress gh errors via '2>/dev/null || true' — this swallows the auth failure silently. Applies to devbox-global update-flake and any script calling 'gh release list', 'gh api repos', etc.

## Instructions

TODO: Add specific instructions based on observed patterns.
