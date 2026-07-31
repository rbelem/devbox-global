# ADR 0004: bitw CLI parity for vault item retrieval

Replace `bw get item <name>` with `bitw get <name>` as the canonical
read path for vault items. The `rbelem/bitw` fork (HEAD `488726f`)
added a `bitw get` subcommand that provides feature parity with
`bw get item` for item retrieval, with shell-safe output suitable for
direct `eval` by calling scripts.

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

| Old (`bw`) | New (`bitw get`) | Where |
|---|---|---|
| `bw login --check` | `bitw get <name> --field name` (success = vault accessible) | `bin/secrets-setup` |
| `bw unlock --raw $pw` | (none — bitw reads from libsecret via Patch #N) | `bin/secrets-refresh`, `bin/secrets-setup` |
| `bw get item <name>` | `bitw get <name> --env-name $VAR` (default mode) | `bin/secrets-refresh` ITEMS |
| `bw get item <name> \| jq '.fields[] \| select(.name==...)' \| .value` | `bitw get <name> --field NAME` (field mode) | `bin/secrets-refresh` CUSTOM_FIELDS |
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
- **Negative**: bitw D-Bus server (the original direction explored)
  was rejected due to name conflict with kwalletd/gnome-keyring
  (Oracle review); we use bitw as a CLI client instead.

## References

- ADR-0001 — vault-as-source-of-truth
- ADR-0002 — master-password libsecret cache (enables bitw unlock)
- ADR-0003 — BW Personal API Key dual-storage
- Fork commit `488726f` — `feat(cli): add bitw get <name> command`
- Fork commit `638e8fd` — `feat(create): add bitw create command for Login ciphers`
- Fork commit `b82e2b4` — `feat(cache): sync vault before building cache file`
- `bin/secrets-add` removed in Phase 3; `bin/secrets-refresh` removed in Phase 4; `bin/secrets-setup` removed in Phase 5; the `secrets-refresh` devbox alias also removed in Phase 6 (all functionality native to bitw)

## Status

Accepted.
