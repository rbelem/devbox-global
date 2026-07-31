# ADR 0003: Bitwarden Personal API key cache (dual-storage pattern)

Store `BW_CLIENTID` and `BW_CLIENTSECRET` (Bitwarden Personal API Key)
in the vault-item cache **and** mirror them to libsecret, so the
`rbelem/bitw` fork can authenticate via `client_credentials` OAuth grant
in any shell with libsecret access — not only shells that sourced the
tmpfs cache after `bitw cache`.

## Context

The `rbelem/bitw` fork authenticates via the `client_credentials` OAuth
grant (with the Bitwarden Personal API Key as `BW_CLIENTID` /
`BW_CLIENTSECRET` environment variables). The server does **not** return a
refresh token for this grant — re-authentication on every token expiry is
the only renewal path. (The `refresh_token` grant is reachable only for
interactive password-grant logins that request `scope=api offline_access`;
that path is out of scope for this ADR.) The fork reads the credentials
primarily in `buildApiKeyGrant` at `auth.go:338-339`; the fallback chain
in `crypto.go:137,153` (`secrets.clientId()` / `secrets.clientSecret()`)
re-checks env and falls through to an interactive prompt if env is empty
— *not* a libsecret lookup. The grant flow itself lives in `loginApiKey`
at `auth.go:168-179`.

ADR-0001 established the vault-as-source-of-truth model: Login-type
items under `devbox-global/`, fetched by `bitw cache` into
`$XDG_RUNTIME_DIR/devbox-secrets.sh` (tmpfs, 600 perms), sourced by
`bin/init-hook`. ADR-0002 documented the master-password libsecret cache
and accepted the same-user-process threat model for the unlocked session.

This ADR extends that architecture for the bitw API key credentials. The
Personal API Key is a one-time-shown value (shown once in the Bitwarden
web vault under Settings → Security → Keys) and grants full vault access
equivalent to master password + 2FA — equivalent to a logged-in BW
desktop session.

## Decision

### Primary: vault item → cache file

A new vault item `devbox-global/bitwarden-api-key` (Login type) holds
the credentials:

- `.login.password` = `BW_CLIENTSECRET` (the sensitive one-time-shown
  value)
- Custom field `BW_CLIENTID` = `user.<uuid>` (the user-supplied client
  identifier)

`bitw cache` (per the manifest's `[cache]` and `[cache-fields]`
sections) fetches this item alongside the others and writes
`export BW_CLIENTSECRET=...` and `export BW_CLIENTID=...` into
`$XDG_RUNTIME_DIR/devbox-secrets.sh`. `bin/init-hook` sources the cache
on every shell start, making the env vars available to `rbelem/bitw`.

### Fallback: libsecret mirror

`bin/init-hook` runs `bitw cache --mirror-libsecret=BW_CLIENTSECRET,BW_CLIENTID`
on shell startup (conditional — only when the cache file is missing).
This single invocation does both jobs in one process: writes the cache
file AND mirrors the requested vars to libsecret. The mirror sources
both values from cmdCache's internal decrypted map (not from `os.Getenv`
— important because the mirror runs before the cache file is sourced;
see ADR-0004 for the rationale).

The libsecret attribute scheme uses **stable semantic names**, not the
env var names. `secret-tool store` reads the secret from STDIN (not
from a positional argument), so the invocations are:

```sh
echo "$BW_CLIENTSECRET" | secret-tool store --label="Bitwarden API key" bitwarden api-key-secret
echo "$BW_CLIENTID"      | secret-tool store --label="Bitwarden API key" bitwarden api-key-client-id
```

The Go mirror follows the same pattern as `storePasswordLibsecret`
(`auth.go:323-325`): argv carries only the label + collection +
attribute pair; the secret rides on `cmd.Stdin`. init-hook's
`$(secret-tool lookup …)` strips trailing newlines from command
substitution, so no newline normalization is needed.

The env-var → semantic-name mapping is the single source of truth for
the mirror-write side, and lives in the Go function
`mirrorAttrFor` (`cache.go`). The bash init-hook fallback reads
`api-key-secret` / `api-key-client-id` (`bin/init-hook:20,24`); the
mapping must stay in sync with those literal strings. The Go mirror
must NOT use the env var name (`BW_CLIENTSECRET` etc.) as the libsecret
attribute, and must NOT pass the secret as a positional argv — both
were regressions introduced by the sync-preflight commit (`b82e2b4`)
where the mirror read from `os.Getenv` and passed the value as a
positional. The B1 fix (`c46baf8`) corrected the read path, the
attr-mapping fix (`60d5ac9`) corrected the write attribute, and the
stdin-channel fix (`89951d8`) corrected the write channel.
(`c46baf8`) corrected the read path but not the write attribute. The
current code (post-Phase D follow-up) reads from the decrypted map AND
uses the semantic attribute names.

Note: the Go binary never reads libsecret directly. The bash init-hook
is what consumes the libsecret mirror and populates the shell env. The
Go fallback chain in `crypto.go:137,153` is for *interactive prompts*,
not for libsecret — if env is empty and there's no TTY, `bitw` errors
with "need a terminal to prompt for a password" for what is actually a
missing API key.

`bin/init-hook` does `secret-tool lookup bitwarden api-key-secret` and
`secret-tool lookup bitwarden api-key-client-id` if the env vars are
unset after sourcing the cache. The attribute scheme matches the existing
`bitwarden master-password` convention from ADR-0002.

This means an interactive shell without `bitw cache` having been run
can still find the credentials (provided libsecret is unlocked).
The fallback does **not** apply to cron or other non-interactive shells,
because `bin/init-hook:6` short-circuits on non-interactive invocations
before reaching the fallback block.

### Runtime token lifecycle

The `client_credentials` grant returns an access token with a ~3600s
TTL but **no** refresh token (the server scopes the grant to
`scope=api` only, suppressing `offline_access`). The token lifecycle:

1. `bitw login` → `loginApiKey()` → POST `/connect/token` with
   `grant_type=client_credentials` → `storeToken()` writes
   `AccessToken` + `TokenExpiry` to `data.json`. `RefreshToken` is `""`.
2. Next `bitw sync` or `bitw cache` → `ensureToken()`:
   - **Fast path** (`main.go:412-419`): cached token valid → no
     network call.
   - **Expired path**: `RefreshToken == ""` → `login(ctx)` →
     `loginApiKey()` → full client_credentials re-grant → new token
     stored.
3. `bitw get` is offline-only (see §Known limitations for the feature/
   hazard analysis).

Credential resolution order: env `BW_CLIENTID` / `BW_CLIENTSECRET`
(`buildApiKeyGrant` at `auth.go:338-339`) → `secrets.clientId()` /
`secrets.clientSecret()` (re-check env, then interactive prompt).
There is no libsecret lookup in Go for the API key; the libsecret
mirror is consumed exclusively by `bin/init-hook`.

### Failure modes

| Scenario | Code path | User-facing error |
|---|---|---|
| No env, no TTY | `login()` → `loginInteractive()` → TTY gate (`auth.go:200`) | `interactive login requires a terminal (stdin is not a TTY); set BW_CLIENTID + BW_CLIENTSECRET for non-interactive login, or set FORCE_STDIN_PROMPTS=true` |
| Only one of `BW_CLIENTID` / `BW_CLIENTSECRET` set | `login()` mismatch guard (`auth.go:157-162`) | `BW_CLIENTID and BW_CLIENTSECRET must both be set or both be empty` |
| Both set, key revoked/invalid | `loginApiKey()` → HTTP 400 | `client_credentials login failed: Bad Request: {"error":"invalid_client"}` |
| Both set, network down | `loginApiKey()` → timeout | `client_credentials login failed: Post "https://identity.bitwarden.com/connect/token": context deadline exceeded` |

There is **no fallback from client_credentials to interactive login**.
If the env vars are set (even to stale values), `login()` commits to
`loginApiKey()` and never tries the password path. A revoked API key
in env is a hard failure until the user fixes the env or the libsecret
mirror.

### Why dual-store

Vault-item-only requires `bitw cache` to have run, which requires
master-password decryption (or libsecret-cached master password via
ADR-0002). If the master password is in libsecret, `bitw cache` runs
non-interactively on shell startup via `bin/init-hook`. But shells that
don't source `bin/init-hook` (orphaned interactive tmux panes,
interactive `su -`) won't have `BW_CLIENTSECRET` unless the libsecret
fallback fires. The libsecret fallback also enables bitw to work in the
time window between machine boot and the first `bitw cache` run. (Cron
jobs and other non-interactive shells short-circuit at `init-hook:6`
and never reach the fallback — they must source the cache explicitly,
or set `BW_CLIENTID` / `BW_CLIENTSECRET` via some other mechanism.)

## Security

### Threat model

Same as ADR-0002: libsecret (gnome-keyring/kwallet) is locked at session
logout — readable only during the unlocked user session. Any same-user
process during the unlocked session can read the API key via
`secret-tool lookup`, but this is the same exposure as `BW_SESSION` in
tmpfs or the master password in the keyring.

### Scope of the API key

A Bitwarden Personal API Key grants full vault access equivalent to
master password + 2FA — equivalent to a logged-in BW desktop session.
Compromise of the API key is equivalent to compromise of the master
password for vault-read purposes.

### Revocation

No auto-rotation. On suspected compromise: vault.bitwarden.com →
Settings → Security → Keys → Revoke. The user must then create a new
Personal API Key, update the vault item (`bw edit item <id>` or web
vault UI), and re-run `bitw cache` to propagate to both the cache and
libsecret.

**Stale libsecret hazard**: `bitw cache --mirror-libsecret` only
*writes* to libsecret when the manifest's decrypted values include
the requested var; it does **not** clear stale entries on revocation.
After revoking or emptying the vault item, manually clear the libsecret
mirror:

```bash
secret-tool clear bitwarden api-key-secret
secret-tool clear bitwarden api-key-client-id
```

Otherwise, shells that hit the `init-hook` fallback will continue to
authenticate with a dead credential and fail with a confusing error.

## Consequences

- **Positive**: bitw auth works in any shell with libsecret access, no
  manual env var exports, vault remains source of truth, rotation is
  `bw edit → bitw cache`.
- **Negative**: two storage surfaces for the same credentials. Confirmed
  by Oracle review (single source of truth preferred for rotation
  hygiene). The dual-store is accepted because the libsecret fallback
  covers the gap between boot and `bitw cache`, and orphaned sessions
  that can't source the cache.
- **Migration**: user creates the vault item once (`bitw create` per
  ADR-0004 / fork `638e8fd`, or web vault UI with Login type,
  password = client secret, custom field `BW_CLIENTID` = client id),
  then `bitw cache --mirror-libsecret=BW_CLIENTSECRET,BW_CLIENTID` to
  populate the cache and mirror to libsecret.

## Known limitations

- **`data.json` has no file locking.** Concurrent `bitw` invocations
  (e.g., two `bitw get` in parallel) load the same `data.json`,
  re-authenticate independently, and last-writer-wins on save. Cache
  output is atomic (tmpfile + rename at `cache.go:217-219`), so the
  user-visible cache file is never partially written; but `data.json`
  itself can be observed truncated mid-write by a third concurrent
  reader. The fix (flock or atomic rename on `data.json`) is deferred.
- **`bitw get` is offline-only.** No token validation, no network
  call, no staleness check. The user is responsible for running
  `bitw sync` (or `bitw cache`) after vault changes; otherwise `bitw get`
  returns pre-change data. This is documented here because the design
  intent ("just decrypt from local data") is unusual for a CLI that
  talks to a remote service.
- **Parallel re-auth is wasteful but not incorrect.** When the access
  token expires, each concurrent `bitw` invocation independently POSTs
  to `/connect/token`. For `client_credentials`, that is one HTTP POST
  each — wasted bandwidth and identity-endpoint rate-limit pressure,
  but not a correctness issue.

## References

- ADR-0001 — vault-as-source-of-truth
- ADR-0002 — master-password libsecret cache
- ADR-0004 — `bw` → `bitw` CLI parity migration (covers `bitw cache`,
  `bitw create`, and the `bin/secrets-*` deprecation arc)
- `bin/init-hook` (libsecret fallback block; sources cache + mirror lookup)
- `rbelem/bitw` fork:
  - `crypto.go:137,153` — env-recheck fallback in `secrets.clientId()` /
    `secrets.clientSecret()` (not libsecret; falls through to
    interactive prompt)
  - `auth.go:168-179` — `loginApiKey()` (the client_credentials grant
    POST, called on every token expiry since no refresh token exists)
  - `auth.go:333-362` — `buildApiKeyGrant()` (env-first credential
    resolution)
  - `auth.go:338-339` — primary env reads for `BW_CLIENTID` /
    `BW_CLIENTSECRET`
  - `main.go:412-432` — `ensureToken()` (cached-token fast path +
    expired-token re-auth)
  - Fork commit `7a0f56d` — `bitw cache` (single-process refresh,
    replaces bash per-item loop)
  - Fork commit `b82e2b4` — `feat(cache): sync vault before building
    cache file` (preflight `ensureToken + sync`; the Runtime token
    lifecycle §above depends on it)
  - Fork commit `c46baf8` — `--mirror-libsecret` from decrypted
    map (B1 fix; closes init-hook env-empty hazard)
  - Fork commit `60d5ac9` — `--mirror-libsecret` writes under semantic
    attr names (`api-key-secret` / `api-key-client-id`) via
    `mirrorAttrFor` so the bash init-hook fallback finds what the
    mirror stored
  - Fork commit `89951d8` — `--mirror-libsecret` passes the secret via
    `cmd.Stdin` (matching `storePasswordLibsecret`'s pattern); without
    this fix the secret-tool call parsed the value as a dangling
    attribute name and silently never stored the credential
  - Fork commit `094e2fc` — refinements: missing-key warning, custom-
    field mirror test, personal-vault success msg

## Status

Accepted. Last updated: 2026-07-30 (Phase D follow-up) — drops dead
`refresh_token` claim, adds runtime token lifecycle + failure modes +
known limitations, corrects stale line refs, replaces body-text
references to the deleted `bin/secrets-refresh` / `bin/secrets-setup` /
`bin/bitw-login` scripts with `bitw cache` / `bitw create` / `bitw login`
(pointed to throughout), and documents the `--mirror-libsecret`
semantic-attr-name mapping (`mirrorAttrFor`) that aligns the mirror
write side with the bash init-hook fallback read side.
