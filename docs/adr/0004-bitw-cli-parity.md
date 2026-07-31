# ADR 0004: bitw CLI parity for vault item retrieval

Replace `bw get item <name>` with `bitw get <name>` as the canonical
read path for vault items. The `rbelem/bitw` fork (HEAD `488726f`)
added a `bitw get` subcommand that provides feature parity with
`bw get item` for item retrieval, with shell-safe output suitable for
direct `eval` by calling scripts.

> **Scope note.** This ADR's title reflects its original scope (read
> path). Since then it has expanded to cover writes (`bitw create`),
> refresh (`bitw cache`), and the full `bin/secrets-*` deprecation
> arc; the migration status table below tracks the whole journey, and
> per-commit rationale lives in the `rev`-pin comments in
> `devbox.d/bitw/flake.nix`.

## Context

Bitwarden CLI (`bw`) was the canonical Bitwarden access tool in
devbox-global from ADR-0001 onward. All vault reads went through
`bw get item <name> | jq ...`, and all vault writes through
`bw encode | bw create item`. ADR-0002 made bitw unlock possible
without `bw` by caching the master password in libsecret (Patch #N).
ADR-0003 extended the architecture for BW Personal API Keys with a
dual-storage pattern (vault item + libsecret mirror).

The `bitw get <name>` CLI command (fork HEAD `488726f`: `get.go`
157 lines, `get_test.go` 49 lines, `main.go` +5 lines) provides
parity with `bw get item <name>` for vault item retrieval. This
enables replacing `bw` on the read path entirely, leaving `bw` only
for vault writes (item creation) — a gap pending a future `bitw
create` fork feature.

## Decision

### Read-path replacement

`bitw get <name>` replaces `bw get item <name>` as the canonical
read path. Two output modes:

- **Default mode**: emits shell-eval-safe `export VAR='value'` lines.
  Caller passes `--env-name VAR` to control the variable name. The
  output is designed for `eval "$(bitw get <name> --env-name VAR)"`.
- **Field mode**: `--field NAME` (repeatable) extracts a single field
  from the item. Field vocabulary: `password`, `username`, `notes`,
  `totp`, `uri`, plus arbitrary custom field names. Output is the raw
  field value to stdout.

### Cache replacement (Phase 4)

The original `bin/secrets-refresh` bash wrapper looped over a hard-coded
ITEMS map and shelled out to `bitw get` once per item. Two operational
hazards motivated `bitw cache` as a single-process replacement:

- **8× Argon2id per refresh.** Each `bitw get` subprocess re-derived
  the master key from the password via Argon2id (~2s on a modern CPU),
  so a refresh of 8 items cost ~16s of CPU time for what is a single
  vault decrypt.
- **Errors masked.** The bash loop piped stderr to `/dev/null` and
  treated every failure as a generic "bitw get failed" line, hiding
  MAC mismatch (stale KDF), missing-cipher, and decryption errors
  from the user.

`bitw cache` (fork `b82e2b4`) reads a manifest (`~/.config/bitw/cache.ini`),
syncs the vault once, decrypts all items in a single process, and writes
the cache file atomically (tmpfile + `chmod 600` + rename). Errors surface
with full context: cipher name, field, error type, KDF state, and
email-source tier. The libsecret mirror for `BW_CLIENTSECRET` /
`BW_CLIENTID` (per ADR-0003) is sourced from the decrypted values, not
`os.Getenv` — important because `bin/init-hook` runs `bitw cache` before
sourcing the cache file, so env-only mirrors would write empty strings
on shell startup (regression closed in `c46baf8`, refined in `094e2fc`).

### Shell-safe escaping

Values are wrapped in single quotes with manual `'` → `'\''` escaping
(canonical POSIX single-quote escape, NOT `fmt.Sprintf("%q", ...)`
which would use double quotes and allow shell expansion). This makes
embedded `$(...)`, backticks, and other shell metacharacters inert
inside the quoted value.

### Field-name validation

Field names passed via `--field` are validated against
`^[A-Za-z_][A-Za-z0-9_]*$` before use. This prevents shell injection
via malicious vault field names — a vault field named `x;evil` must
never reach `eval`. The regex restricts to valid shell identifier
characters, rejecting anything with metacharacters.

### Stdout discipline

Values go to stdout; diagnostics (errors, warnings, status messages)
go to stderr. Non-zero exit on failure. This separation ensures that
`eval "$(bitw get ...)"` only evaluates exported variables, never
diagnostic text.

### Migration status

| Script | Status |
|---|---|
| `bin/secrets-refresh` | Removed in Phase 4 — superseded by `bitw cache` (fork b82e2b4, which now syncs the vault first as part of the same single-process call). The `devbox global run secrets-refresh` devbox alias was also removed in Phase 6; users run `bitw cache` directly. |
| `bin/secrets-setup` | Removed in Phase 5 — the `~/.bashrc.d/` plaintext source files are gone (user confirmed all secrets should live in Bitwarden going forward). Master password libsecret storage is handled natively by `bitw login` (Phase 2). New items are created directly via `bitw create`. |
| `bin/bitw-login` | Removed in Phase 7 — thin UX wrapper superseded by native `bitw login` (auth.go). Discoverability via AGENTS.md, consistent with `bitw cache`. The `auth_test.go` suite covers `bitw login` end-to-end (interactive / API-key / 2FA / non-TTY / libsecret-storage paths); the bash wrapper had zero tests. |
| `bitw create` (native, fork) | Replaces `bin/secrets-add` entirely — use `bitw create <name> [--notes NOTES] [--field NAME=VALUE]...` directly. `bin/secrets-add` deleted in Phase 3. |

## Security

### Field-name validation

The single most important safety check. A vault field named
`x;evil-command` must never reach `eval`. The regex
`^[A-Za-z_][A-Za-z0-9_]*$` restricts field names to valid shell
identifier characters, rejecting anything with semicolons, pipes,
backticks, `$()`, or other metacharacters. This is defense-in-depth
on top of the single-quote escaping — even if the escaping were
somehow bypassed, the field name itself cannot contain shell syntax.

### Shell-escape correctness

The manual `'` → `'\''` escaping makes embedded `$(...)`, backticks,
and other shell metacharacters inert inside single-quoted values.
This is the canonical POSIX single-quote escape: end the single-quoted
string, emit an escaped literal single quote, start a new single-quoted
string. The result is a single shell token with no expansion.

### Stdout/stderr discipline

Diagnostics to stderr prevents them from being captured by
`eval "$(bitw get ...)"`. If an error message went to stdout, it
would be eval'd as shell code — potentially executing arbitrary
commands if the error message contained shell metacharacters. The
strict separation (values → stdout, diagnostics → stderr, non-zero
exit on failure) ensures eval safety.

## Migration map

| Old (`bw`) | New (`bitw get`) | Where (historical) |
|---|---|---|
| `bw login --check` | `bitw get <name> --field name` (success = vault accessible) | `bin/secrets-setup` (removed Phase 5) |
| `bw unlock --raw $pw` | (none — bitw reads from libsecret via Patch #N) | `bin/secrets-refresh` (removed Phase 4), `bin/secrets-setup` (removed Phase 5) |
| `bw get item <name>` | `bitw get <name> --env-name $VAR` (default mode) | `bin/secrets-refresh` (removed Phase 4) ITEMS |
| `bw get item <name> \| jq '.fields[] \| select(.name==...)' \| .value` | `bitw get <name> --field NAME` (field mode) | `bin/secrets-refresh` (removed Phase 4) CUSTOM_FIELDS |
| `bw encode \| bw create item` | `bitw create <name> [--notes NOTES] [--field NAME=VALUE]...` | direct (no script) |

## Consequences

- **Positive**: `bw` no longer needed for read paths; vault access is
  fully bitw-mediated for reads; scripts simpler (no `jq` dependency
  for field extraction).
- **Positive**: bitw's libsecret master-pw cache (ADR-0002) eliminates
  the `bw unlock --raw` round-trip on every refresh — bitw reads the
  master password from libsecret directly.
- **Positive (Phase 3)**: `bitw create` shipped (fork `638e8fd`); the
  previous `bin/secrets-add` bash wrapper is removed. `bw` is now only
  needed for vault writes via `bw encode | bw create item` if the user
  declines to use the native `bitw create`; `bitwarden-cli` can be
  removed from `devbox.json` once `bitw create` is exercised against the
  real vault.
- **Positive (Phase 4)**: `bitw cache` replaces the bash `bin/secrets-refresh`
  per-item loop. Single-process decrypt (no 8× Argon2id), atomic cache
  file write, full error context per failure (cipher / field / KDF / email-source),
  and a libsecret mirror sourced from decrypted values (not the process
  env) so the init-hook call path is safe.
- **Negative**: bitw D-Bus server (the original direction explored)
  was rejected due to name conflict with kwalletd/gnome-keyring
  (Oracle review); we use bitw as a CLI client instead.

## References

- ADR-0001 — vault-as-source-of-truth
- ADR-0002 — master-password libsecret cache (enables bitw unlock)
- ADR-0003 — BW Personal API Key dual-storage
- Fork commit `488726f` — `feat(cli): add bitw get <name> command`
- Fork commit `7a0f56d` — `feat(cache): add bitw cache to replace bash secrets-refresh 8x proc spawn loop`
- Fork commit `061eeb7` — `feat(login): add JWT email fallback as fourth tier for client_credentials`
- Fork commit `0cb7762` — `fix(login): ensureToken fast-path skips re-auth when cached access token is still valid`
- Fork commit `9bb2335` — `fix(sync): refresh KDF on every sync to recover from vault re-key for client_credentials users`
- Fork commit `8c4d06c` — `fix(auth): remove Auth-Email header (Bitwarden maps invalid header to invalid_username_or_password, silently rejecting password grant)`
- Fork commit `035ea4f` — `feat(login): interactive password-grant flow with zenity > kdialog > SSH_ASKPASS > tty chain`
- Fork commit `f9f990d` — `feat(login): progress indicators + libsecret awareness to interactive prompts`
- Fork commit `638e8fd` — `feat(create): add bitw create command for Login ciphers`
- Fork commit `b82e2b4` — `feat(cache): sync vault before building cache file (replaces bash preflight)`
- Fork commit `c46baf8` — `fix(cache): mirror libsecret from decrypted map, not os.Getenv (closes B1 regression)`
- Fork commit `094e2fc` — `refactor(cache,create): refinements to B1 fix (missing-key warning, [cache-fields] test, personal-vault success msg)`
- `bin/secrets-add` removed in Phase 3; `bin/secrets-refresh` removed in Phase 4; `bin/secrets-setup` removed in Phase 5; the `secrets-refresh` devbox alias also removed in Phase 6; `bin/bitw-login` removed in Phase 7 (all functionality native to bitw)

## Status

Accepted. Last updated: 2026-07-30 — Phase 7 scope (bitw-login wrapper removed); ADR-0004 now documents the full bw → bitw migration arc through Phase 7.
