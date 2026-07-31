# ADR 0003: Bitwarden Personal API key cache (dual-storage pattern)

Store `BW_CLIENTID` and `BW_CLIENTSECRET` (Bitwarden Personal API Key)
in the vault-item cache **and** mirror them to libsecret, so the
`rbelem/bitw` fork can authenticate via `client_credentials` OAuth grant
in any shell with libsecret access — not only shells that sourced the
tmpfs cache after `secrets-refresh`.

## Context

The `rbelem/bitw` fork is a D-Bus Secret Service provider for Bitwarden.
After the stub fix in `refreshToken()`, it requires `BW_CLIENTID` and
`BW_CLIENTSECRET` environment variables (a Bitwarden Personal API Key)
for the `client_credentials` OAuth grant and `refresh_token` grant. The
fork reads these via `os.Getenv` at `crypto.go:111` and `crypto.go:127`;
the grant flow lives in `auth.go:115-134`.

ADR-0001 established the vault-as-source-of-truth model: Login-type
items under `devbox-global/`, fetched by `bin/secrets-refresh` into
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

`bin/secrets-refresh` fetches this item alongside the others and writes
`export BW_CLIENTSECRET=...` and `export BW_CLIENTID=...` into
`$XDG_RUNTIME_DIR/devbox-secrets.sh`. `bin/init-hook` sources the cache
on every shell start, making the env vars available to `rbelem/bitw`.

### Fallback: libsecret mirror

After writing the cache, `bin/secrets-refresh` sources it and mirrors
both values to libsecret via `secret-tool store`:

- `secret-tool store --label="Bitwarden API key" bitwarden api-key-secret "$BW_CLIENTSECRET"`
- `secret-tool store --label="Bitwarden API key" bitwarden api-key-client-id "$BW_CLIENTID"`

`bin/init-hook` does `secret-tool lookup bitwarden api-key-secret` and
`secret-tool lookup bitwarden api-key-client-id` if the env vars are
unset after sourcing the cache. The attribute scheme matches the existing
`bitwarden master-password` convention from ADR-0002.

This means an interactive shell without `secrets-refresh` having been
run can still find the credentials (provided libsecret is unlocked).
The fallback does **not** apply to cron or other non-interactive shells,
because `bin/init-hook:6` short-circuits on non-interactive invocations
before reaching the fallback block.

### Why dual-store

Vault-item-only requires `secrets-refresh` to have run, which requires
`bw unlock`, which requires the master password. If the master password
is in libsecret (per ADR-0002), `secrets-refresh` is one keystroke away.
But shells that don't source `bin/init-hook` (orphaned interactive tmux
panes, interactive `su -`) won't have `BW_CLIENTSECRET` unless the
libsecret fallback fires. The libsecret fallback also enables bitw to
work in the time window between machine boot and `secrets-refresh` first
run. (Cron jobs and other non-interactive shells short-circuit at
`init-hook:6` and never reach the fallback — they must source the cache
explicitly.)

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
vault UI), and re-run `devbox global run secrets-refresh` to propagate
to both the cache and libsecret.

**Stale libsecret hazard**: `secrets-refresh` only *writes* to libsecret
when the vault item has values; it does **not** clear stale entries on
revocation. After revoking or emptying the vault item, manually clear
the libsecret mirror:

```bash
secret-tool clear bitwarden api-key-secret
secret-tool clear bitwarden api-key-client-id
```

Otherwise, shells that hit the `init-hook` fallback will continue to
authenticate with a dead credential and fail with a confusing error.

## Consequences

- **Positive**: bitw auth works in any shell with libsecret access, no
  manual env var exports, vault remains source of truth, rotation is
  `bw edit → secrets-refresh`.
- **Negative**: two storage surfaces for the same credentials. Confirmed
  by Oracle review (single source of truth preferred for rotation
  hygiene). The dual-store is accepted because the libsecret fallback
  covers the gap between boot and `secrets-refresh`, and orphaned
  sessions that can't source the cache.
- **Migration**: user creates the vault item once (`bw create item` or
  web vault UI with Login type, password = client secret, custom field
  `BW_CLIENTID` = client id), then `devbox global run secrets-refresh`
  to populate the cache and mirror to libsecret.

## References

- ADR-0001 — vault-as-source-of-truth
- ADR-0002 — master-password libsecret cache
- `bin/secrets-refresh` (line 51-59 ITEMS, line 61-63 CUSTOM_FIELDS)
- `bin/init-hook` (libsecret fallback block)
- `bin/bitw-login` (manual first-run script — removed in Phase 7; users now run `bitw login` directly)
- `rbelem/bitw` fork: `crypto.go:111,127` (env var reads);
  `auth.go:115-134` (client_credentials grant)

## Status

Accepted.
