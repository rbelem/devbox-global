# ADR 0002: Keyring master-password cache for Bitwarden unlock

Store the Bitwarden master password in the system keyring (via libsecret)
to enable non-interactive vault unlock. ADR-0001 §Why-not-alternatives
rejected keyring auto-unlock, but `bin/secrets-setup` implements exactly
this. This ADR documents the actual security model and supersedes the
rejection for the master-password cache specifically.

## Context

ADR-0001 (line 72) rejected "Keyring auto-unlock" with the rationale:
"Stores master password in kwallet — retrievable by any same-user process."
The concern was that any process running as the same user could read the
master password from the keyring during an unlocked session.

Despite this explicit rejection, the implementation stores the master
password in the keyring:

- **`bin/secrets-setup:82`**: `echo "$master_pw" | secret-tool store --label="Bitwarden" bitwarden master-password`
- **`bin/secrets-refresh:28`**: `master_pw="$(secret-tool lookup bitwarden master-password 2>/dev/null)"`
- **`rbelem/bitw` fork** (`devbox.d/bitw/flake.nix:65`): unlocks the vault
  from `secret-tool lookup bitwarden master-password` before falling back
  to an interactive prompt.

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
read the master password. This is **true**, but the threat surface is
no worse than the existing `bw unlock` flow:

1. **`bw unlock` writes `BW_SESSION` to env vars** — `BW_SESSION` is
   readable by any same-user process via `/proc/<pid>/environ` or `ps e`.
   The master password in the keyring has the **same exposure window**
   (unlocked session) as `BW_SESSION`.

2. **Keyring is locked at logout** — the master password is not persisted
   across sessions. After logout, the keyring requires the login password
   to unlock. This is **better** than a plaintext cache file on disk.

3. **`tmpfs`-backed `$XDG_RUNTIME_DIR`** — the secrets cache file
   (`$XDG_RUNTIME_DIR/devbox-secrets.sh`) is on tmpfs (RAM-backed, not
   written to disk) with 600 permissions. This is the same tmpfs that
   holds `BW_SESSION` after `bw unlock`.

4. **Uniform threat surface** — the `rbelem/bitw` fork already uses this
   same keyring for vault unlock. The master password is already exposed
   to same-user processes via bitw's libsecret path. The `secrets-setup`
   and `secrets-refresh` scripts use the **same keyring entry**, so the
   threat surface is uniform (not additive).

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
  `secrets-refresh` and `bitw` can unlock non-interactively; uniform
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

## Status

Accepted.
