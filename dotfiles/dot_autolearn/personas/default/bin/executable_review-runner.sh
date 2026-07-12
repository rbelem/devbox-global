#!/bin/sh
# Autolearn review runner - runs opencode review, deletes the session,
# then pushes the updated store via sync (if configured).
# Args: passed directly to `opencode run --format json`
OUT=$(mktemp "${TMPDIR:-/tmp}/alreview.XXXXXX")
opencode run --format json "$@" > "$OUT" 2>/dev/null
SID=$(sed -n '1{s/.*"sessionID":"\([^"]*\)".*/\1/p;}' "$OUT")
rm -f "$OUT"
[ -n "$SID" ] && opencode session delete "$SID" >/dev/null 2>&1
# Push after review completes so reviewer-written changes are included.
# Stays silent when sync isn't configured (no API key or no salt).
if [ -n "${AUTOLEARN_SYNC_API_KEY}" ] && [ -f "${HOME}/.autolearn/.encryption_salt" ]; then
  uv run "${HOME}/.agents/skills/autolearn-reviewer/scripts/autolearn.py" sync push >/dev/null 2>&1
fi
