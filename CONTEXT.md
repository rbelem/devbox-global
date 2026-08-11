# devbox-global

Personal devbox global config (Rodrigo Belem). Declares entire CLI dev
environment — Nix packages, dotfiles, shell config, editor — installable
on any Linux machine via `devbox global pull`.

## Language

**Bitwarden vault namespace**:
A naming convention for organizing secrets in the Bitwarden vault.
`devbox-global/` is reserved for this repo's secrets. Per-project
namespaces (`project/<name>/`) can be defined separately.
**Secrets Manager secret**:
A key-value pair in Bitwarden Secrets Manager. The *name* is the env
var name (e.g. `GITHUB_TOKEN`, `OPENAI_API_KEY`), the *value* is the
secret material. Replaces vault items as the canonical secret store.
_Avoid_: Login-type vault items for env-var secrets

**Secrets cache**:
A regenerable file in tmpfs (`$XDG_RUNTIME_DIR/devbox-secrets.sh`)
containing exported env vars. Populated on demand from SM via the
`~/.config/bws/sm.ini` manifest, sourced by devbox init_hook.
Not the source of truth — SM is.
_Avoid_: Persistent cache locations, loading secrets from any other mechanism

**Secrets refresh**:
The act of fetching the current secret values from Bitwarden SM
and writing them to the secrets cache. Run via `bws secret list --output env`
(or delete the cache and let init_hook regenerate it).
`bin/init-hook` regenerates the cache on shell startup if the file
is missing.
_Avoid_: Auto-refresh, staleness checks

**Workspace identifier**:
An opaque routing identifier (e.g. `OPENCODE_GO_WORKSPACE_ID`) stored
as an SM secret alongside the other env-var secrets to keep
account-specific identifiers out of the public repo.
_Avoid_: Hardcoding workspace IDs in `devbox.json` `env` block
