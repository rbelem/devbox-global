# ADR 0002: Keyring master-password cache for Bitwarden unlock

Store the Bitwarden master password in the system keyring (via libsecret)
to enable non-interactive vault unlock. ADR-0001 §Why-not-alternatives
rejected keyring auto-unlock, but the implementation (the now-removed
`bin/secrets-setup` script, superseded in Phase 5 by `bitw create` +
`bitw login`'s `storePasswordLibsecret` at `auth.go:316`) implements
exactly this. This ADR documents the actual security model and
supersedes the rejection for the master-password cache specifically.

## Context

ADR-0001 (line 72) rejected "Keyring auto-unlock" with the rationale:
"Stores master password in kwallet — retrievable by any same-user process."
The concern was that any process running as the same user could read the
master password from the keyring during an unlocked session.

Despite this explicit rejection, the implementation stores the master
password in the keyring:

- **`bin/secrets-setup`** (REMOVED Phase 5 — referenced here for historical
  context only): wrote the master password to libsecret via
  `secret-tool store --label="Bitwarden" bitwarden master-password`.
  The same operation is now done by `bitw login`'s
  `storePasswordLibsecret` (`auth.go:316`).
- **`bin/secrets-refresh`** (REMOVED Phase 4 — referenced here for historical
  context only): did **not** read the master password directly. The
  `rbelem/bitw` fork reads it internally via `readLibsecretPassword()`
  (`crypto.go:124-131`) when invoked by `bitw get` / `bitw cache` /
  `bitw sync` (the modern replacement for the deleted
  `bin/secrets-refresh` bash script).
- **`rbelem/bitw` fork** (`crypto.go:124-131` — `readLibsecretPassword`): unlocks
  the vault from `secret-tool lookup bitwarden master-password` before
  falling back to an interactive prompt via `passwordPrompt`.

The practice was adopted for convenience (no repeated master-password
prompts after first unlock) despite the ADR's reasoning. This ADR
formalizes the actual security model.

## Decision

### Current behavior

The master password is stored in the system keyring via libsecret
(gnome-keyring on GNOME, kwallet on KDE). The keyring is locked at
session logout and unlocked at login. During an unlocked session, any
process running as the same user can read the master password via
`secret-tool lookup bitwarden master-password`.

### Security analysis

**Threat model**: any same-user process during an unlocked session can
read the master password. This is an **accepted trade-off**, justified
on security merits independent of any comparison to other auth flows:

1. **Keyring is locked at logout** — the master password is not persisted
   across sessions. After logout, the keyring requires the login password
   to unlock. This is **better** than a plaintext cache file on disk.

2. **`tmpfs`-backed `$XDG_RUNTIME_DIR`** — the secrets cache file
   (`$XDG_RUNTIME_DIR/devbox-secrets.sh`) is on tmpfs (RAM-backed, not
   written to disk) with 600 permissions.

3. **Same-user process isolation** — modern session infrastructure
   (systemd --user, D-Bus session bus, gnome-keyring/kwallet) explicitly
   trusts same-user access within an unlocked session as the right
   granularity for desktop secrets. The devbox-global threat model
   inherits that assumption.

4. **Uniform threat surface** — the `rbelem/bitw` fork already uses this
   same keyring for vault unlock. The master password is already exposed
   to same-user processes via bitw's `readLibsecretPassword` path. The
   deleted `secrets-setup` and `secrets-refresh` bash scripts also used
   the **same keyring entry**, so the threat surface is uniform
   (not additive).

### Mitigations

- **Screen lock / logout when away from keyboard** — locks the keyring,
  requiring the login password to unlock.
- **`tmpfs`-backed `$XDG_RUNTIME_DIR`** — secrets cache is RAM-backed,
  not written to disk.
- **600 permissions on `$XDG_RUNTIME_DIR/devbox-secrets.sh`** — only the
  owner can read the cache file (though same-user processes can still
  read it via the keyring API).

### Decision

Accept the keyring master-password cache as part of the secrets
architecture. The convenience gain (no repeated prompts after first
unlock) outweighs the same-user-process risk, which is no worse than
`BW_SESSION` env var exposure.

## Consequences

- **Positive**: no repeated master-password prompts after first unlock;
  `bitw` can unlock non-interactively (post-Phase 4 migration); uniform
  threat surface across all libsecret-based unlock paths.
- **Negative**: compromise of the user session exposes the master
  password **and** `BW_SESSION`. An attacker with same-user access during
  an unlocked session can read both from the keyring and env vars.
- **Mitigation**: prefer screen lock / logout when away from keyboard.
  The keyring is locked at logout, requiring the login password to
  unlock — this is better than a plaintext cache file on disk.

## Relationship to ADR-0001

ADR-0001 remains the accepted architecture for vault-item loading (cache
file, init_hook, script layout). This ADR amends the keyring-specific
reasoning in ADR-0001 §Why-not-alternatives. The rejection of "Keyring
auto-unlock" in ADR-0001 was based on a threat model that is no worse
than the existing `BW_SESSION` exposure. This ADR documents the actual
security model and accepts the trade-off.

## Forward references
- Token-broker daemon (ADR-0005): **REJECTED** 2026-07-30. The "delete this cache" alternative (secrets-agent model, DECRYPT/ENCRYPT over the wire, daemon holds the master key) was also rejected. The libsecret master-password cache remains the path for `bitw` to decrypt the vault; the `bitw cache` single-process refresh (`b82e2b4`) and `ensureToken` fast path (`main.go:412-432`) together remove the multi-process contention the broker was designed for.

## Related
- Supersedes: ADR-0001 §Why-not-alternatives (rejection of "Keyring auto-unlock")
- Superseded-by: nothing (cache retained under chosen architecture)
- Amends: nothing

## Status

Accepted.
**Last-verified:** 2026-07-29 (post-Phase 0 ADR cleanup)
