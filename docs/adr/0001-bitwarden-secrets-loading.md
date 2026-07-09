# ADR 0001: Bitwarden secrets loading via cache file

Replace plaintext API keys in `~/.bashrc.d/` with secrets managed by
Bitwarden CLI (`bw`). Secrets live in Login-type vault items under the
`devbox-global/` namespace, fetched to a tmpfs cache file on demand, and
sourced by the devbox init_hook on terminal start. No `bw` call happens
on the shell-start path — only a read of a 600-perm cache file.

## Context

Seven files in `~/.bashrc.d/` export plaintext API keys (GitHub PAT,
OpenAI, Mistral, Firecrawl, auth cookies) at **644 permissions**
(world-readable). They are not in the repo but are sourced by `~/.bashrc`
via a loop and leak into backups via chezmoi. Rotating a key means
editing a file by hand. There is no audit trail.

`bitwarden-cli@latest` is already declared in `devbox.json`. The shell
session is always inside `devbox global shellenv`, so `bw` is guaranteed
on `PATH` when init_hook runs.

## Decision

### Vault structure

- **Item type**: Login (password field = secret value, username = empty)
- **Namespace**: `devbox-global/<secret-name>` (hyphenated)
- **Custom fields**: non-secret config values associated with a secret
  (e.g. `OPENAI_BASE_URL`, `OPENAI_MODEL` on `devbox-global/openai-api-key`)
- **Items created**:

  | Item | Env var |
  |---|---|
  | `devbox-global/github-token` | GITHUB_TOKEN (→ GH_TOKEN derived) |
  | `devbox-global/mistral-api-key` | MISTRAL_API_KEY |
  | `devbox-global/firecrawl-api-key` | FIRECRAWL_API_KEY |
  | `devbox-global/openai-api-key` | OPENAI_API_KEY + BASE_URL + MODEL (custom fields) |
  | `devbox-global/opencode-auth-cookie` | OPENCODE_GO_AUTH_COOKIE |
  | `devbox-global/opencode-workspace-id` | OPENCODE_GO_WORKSPACE_ID |

### Loading mechanism

- **Cache file**: `$XDG_RUNTIME_DIR/devbox-secrets.sh` (tmpfs, 600 perms,
  per-login-session, regenerable from vault)
- **Init_hook**: one line — `[ -f "$CACHE" ] && . "$CACHE"` — placed
  right after the non-interactive guard (line 89 of `devbox.json`).
  No `bw` call, no staleness check, no prompt.
- **Refresh**: manual only. `devbox global run secrets-refresh` fetches
  all items from bw and writes the cache. Requires `bw unlock` to have
  been run (prompts for master password once per login session).
- **Fallback when `$XDG_RUNTIME_DIR` unset**: secrets not loaded. This
  only occurs in non-standard sessions (orphaned tmux, `su -`) where
  secrets are typically not needed.

### Script layout

All scripts live in `bin/` under the repo root, synced to
`$(devbox global path)/bin/` via config-sync:

| Script | Purpose |
|---|---|
| `bin/config-sync` | (moved from repo root) bidirectional repo↔global sync |
| `bin/update-flake` | (moved from repo root) check/update flake versions |
| `bin/secrets-setup` | one-time migration: reads existing bashrc.d → creates vault items |
| `bin/secrets-refresh` | fetches vault items → writes `$XDG_RUNTIME_DIR/devbox-secrets.sh` |

## Why not alternatives

| Alternative | Rejected because |
|---|---|
| **Direct `bw` calls in init_hook** | Adds ~5s to every shell start; `bw` may not be unlocked; prompts block |
| **Auto-refresh on shell start** | Marginal benefit (secrets rarely change mid-session); adds latency for no gain |
| **Keyring auto-unlock** | Stores master password in kwallet — retrievable by any same-user process |
| **Secure Note item type** | Login type has a cleaner jq path (`.login.password`) and is more natural for secrets |
| **`~/.cache/`** | Wiped by aggressive cache-cleaning; persistent on disk after logout |
| **`~/.local/state/`** | Implies persistence that the regenerable cache doesn't need; caught by backups |
| **Per-login prompt for master password** | Once-per-session `bw unlock` is acceptable; on every terminal would be unusable |

## Consequences

- **Positive**: secrets go from 644 to 600, vault becomes source of truth,
  rotation becomes `bw edit → secrets-refresh`, no change to non-interactive
  shells (same as current behavior).
- **Negative**: once-per-login-session `bw unlock` required. Secrets unavailable
  in non-interactive sessions without explicit `source`. Cache is plaintext on
  tmpfs — no regression from current plaintext-in-bashrc.d, but not zero-disk
  either.
- **Recovery risk**: removing `~/.bashrc.d/` files is destructive after the
  vault is populated. Rollback requires recreating files from vault values.
  The `secrets-setup` script is one-time only.

## Status

Accepted.
