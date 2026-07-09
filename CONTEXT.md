# devbox-global

Personal devbox global config (Rodrigo Belem). Declares entire CLI dev
environment — Nix packages, dotfiles, shell config, editor — installable
on any Linux machine via `devbox global pull`.

## Language

**Bitwarden vault namespace**:
A naming convention for organizing secrets in the Bitwarden vault.
`devbox-global/` is reserved for this repo's secrets. Per-project
namespaces (`project/<name>/`) can be defined separately.
_Avoid_: `devbox/`, flat names without prefix

**Vault item**:
A Login-type record in the Bitwarden vault whose `password` field
holds a secret (API key, token, auth cookie). The `name` follows the
vault namespace convention (e.g. `devbox-global/github-token`). The
`username` field is omitted.
_Avoid_: Secure Note type

**Custom vault field**:
A key-value pair on a vault item for non-secret config associated with
a secret. For example, `OPENAI_BASE_URL` and `OPENAI_MODEL` live as
custom text fields on the `devbox-global/openai-api-key` item.
_Avoid_: Separate vault items for config values

**Secrets cache**:
A regenerable file in tmpfs (`$XDG_RUNTIME_DIR/devbox-secrets.sh`)
containing exported env vars. Populated on demand from the vault,
sourced by devbox init_hook. Not the source of truth — the vault is.
_Avoid_: Persistent cache locations, loading secrets from any other mechanism

**Secrets refresh**:
The act of fetching the current secret values from the Bitwarden vault
and writing them to the secrets cache. Performed manually via
`devbox global run secrets-refresh`, not on shell start.
_Avoid_: Auto-refresh, staleness checks

**Workspace identifier**:
An opaque routing identifier (e.g. `OPENCODE_GO_WORKSPACE_ID`) stored
in the vault alongside secrets to keep account-specific identifiers
out of the public repo.
_Avoid_: Hardcoding workspace IDs in `devbox.json` `env` block
