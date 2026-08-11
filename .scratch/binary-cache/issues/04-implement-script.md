# 04 - Implement the combined script

Type: task
Status: resolved
Blocked by: 02, 03

## Question

Build the script per 02's design and 03's config surface: one entry point
covering configure + upload (+ info/status as designed), idempotent, wired to
nix.conf + aws config, reading devbox.json/env per 03. Update or retire
bin/upload-flakes accordingly, and wire the script into devbox.json scripts
(`devbox global run ...`).

The answer records what was implemented, the exact commands, and any facts
later tickets depend on.

## Answer

Implemented by fixer (ses_012ee7f25ffe6d9zMVL5R3FJfg), 2026-08-10.

**Delivered:**
- `bin/cache` (~590 lines): subcommands configure/upload/status/help; config resolution env `DEVBOX_CACHE_*` > devbox.json `nix.cache.*` > defaults; pure `compose_cache_uri`/`uri_endpoint` functions; managed marker-block rewriting (idempotent, merges pre-existing substituters/pubkeys — doesn't clobber cache.nixos.org); key generation `nix key generate-secret-key` + `nix-store --generate-binary-cache-key` fallback (nix 2.34.8 lacks the former); sign→copy upload (per-flake ✓/✗/cached + failure list); closure upload via `global_path/.devbox/nix/profile`; `[default]`+`[profile]` aws sections in root mode (daemon reads default profile); creds via env/stdin/prompt only; best-effort `systemctl restart nix-daemon`; single/multi-user detection; trusted-users warning with `$(id -un)`; multi-user-without-sudo hint mode (exit 1, honest); `DEVBOX_CACHE_DEBUG=1` unhides nix stderr.
- devbox.json: `"cache"` script entry added (line ~115); nothing else touched by this ticket.
- bin/upload-flakes: 3-line shim `exec "$(dirname "$0")/cache" upload "$@"`.

**Verification:** bash -n pass; shellcheck -S warning clean (info-level color-printf notes only, same as old script style); 23 unit assertions pass (URI composition, env>json>defaults, marker-block idempotency byte-identical, pubkey/substituter merging); sandboxed end-to-end configure wrote correct nix.conf + aws config (0600) + key (0600), idempotent on re-run; status/help/shim dispatch verified; `path:` installable eval verified against real devbox.d flake; jq extraction on real devbox.json (29 flakes, map+string forms).

**Deviations (spec-justified):**
1. Root-mode upload parity: configure writes both `/root/.aws/config` (with `[default]` mirror — daemon reads default profile) AND user `~/.aws/config`, plus mirrors signing key to `~/.cache/devbox-cache/secret-key` — otherwise upload (never sudo) breaks on the pusher itself. Ticket 01's "static keys in ~root" was pull-side; pusher creds must be user-readable.
2. `DEVBOX_CACHE_PUBKEY` env: pullers can feed the pusher's pubkey into trusted-public-keys (key-distribution mechanism was unspecified in 01-reopen).
3. `virtual-style` param kept (nix 2.34.8 warns "unknown setting" but behaves path-style with endpoint; harmless + forward-compatible).
4. `upload` exits 1 on any flake failure (old script exited 0 on flake failures, 1 only on closure failure) — silent success was a footgun.
5. Closure upload runs even with zero enabled flakes (old script exited early).
6. jq `//` gotcha: `path_style: false` swallowed by `// ""` — explicit boolean branch.
7. aws config written 0600 (holds static keys).
8. Pre-existing dirty state: devbox.json packages array→map rewrite (87 lines, NOT from this ticket) — recommend separate commit.

**Follow-up (backend lane):** real `nix copy` against RustFS not tested — no live endpoint yet; smoke test is the backend handoff's deliverable.

