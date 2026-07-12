# Autolearn Memory

<!-- Managed by autolearn. Do not edit the structure. -->

- When 'devbox global run update-flake' shows all flake packages as 'unknown' for LATEST version, the root cause is NOT 'gh not in PATH' (as AGENTS.md docs claim). The actual root cause is 'gh' not being authenticated — run 'gh auth status' to confirm. If it says 'You are not logged into any GitHub hosts', run 'gh auth login' to fix. The script's '2>/dev/null || true' pattern on gh calls silently swallows the auth error, making all packages show 'unknown'. Both 'devbox global run update-flake' and direct script invocation produce identical output, so the documented distinction between the two execution methods is also incorrect.
