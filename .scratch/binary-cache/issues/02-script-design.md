# 02 - Single script design

Type: grilling
Status: resolved
Blocked by: 01

## Question

What is the shape of the one combined script that replaces `devbox cache`?

Sub-questions:

- **Command surface**: one entry point with subcommands (configure / upload /
  info / status) vs one script doing everything? Must stay one script per user
  pref.
- **Idempotency**: re-running configure must be a no-op on already-correct
  state; upload must skip already-cached paths (existing upload-flakes
  behavior).
- **Sudo policy**: passwordless sudo required, or prompt? Which operations
  need it (append trusted-users, write ~root/.aws/config)?
- **Wiring details**: nix.conf lines (extra-substituters, trusted users),
  aws config shape (static vs credential_process), MinIO endpoint via
  `AWS_ENDPOINT_URL_S3` or `endpoint_url`.
- **Friction reduction**: what makes it one command on a fresh machine?
  `devbox global run <script>` ergonomics; failure UX (keep upload-flakes
  colored output style).
- **Fate of bin/upload-flakes**: replaced by the new script, or kept as a
  thin caller?

## Answer

- **Shape**: single script, subcommands — `bin/cache configure`, `bin/cache upload`, `bin/cache status` (info). One file, clear entry points, mirrors old `devbox cache` UX.
- **Upload scope**: flakes (enabled `path:devbox.d/<name>` from devbox.json) + full global closure (`-c` style) — preserve upload-flakes behavior, keep per-package failure granularity.
- **Sudo**: use sudo when available (writes `/etc/nix/nix.conf` + `~root/.aws/config`), warn and fall back to user-level `~/.config/nix/nix.conf` + `~/.aws/config` on single-user/no-sudo. `upload` never needs sudo.
- **Wiring**: configure appends `extra-trusted-substituters = s3://<uri>` (and `trusted-users` when sudo) to nix.conf; writes endpoint + static keys into aws config (`endpoint_url` or `AWS_ENDPOINT_URL_S3`); upload passes env-var overrides (`AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`/`AWS_ENDPOINT_URL_S3`) per run for CI.
- **devbox.json question**: nix cannot read devbox.json directly — it reads nix.conf. The only nix-side bridge is the generated flake.nix `nixConfig` block, which upstream devbox does NOT emit (confirmed: `internal/shellgen/tmpl/flake.nix.tmpl` has no nixConfig). So: devbox.json is the config SOURCE OF TRUTH the script reads (ticket 03), and configure translates it into nix.conf + aws config, which nix actually consumes. Adding `nixConfig` to the upstream flake template is out of scope (upstream change).
- **upload-flakes**: retired; devbox.json scripts entry points at `bin/cache upload`. Old file deleted or reduced to a compatibility alias — decide in 04.

## Oracle corrections folded in (ses_0130051e0ffe79M1WcXl6j0KSu)

- **Daemon restart**: after editing `trusted-users`, `systemctl restart nix-daemon` (best-effort, warn if no sudo/systemctl) — without it, upload silently fails on untrusted substituter. Deleted upstream had restartDaemon for exactly this.
- **Idempotent config blocks**: managed marker blocks, rewrite between them (never `>>` append — duplicates corrupt/accumulate):
  `# BEGIN devbox-global-cache` ... `# END devbox-global-cache` in nix.conf and aws config.
- **URI composition**: nix s3 store needs `s3://$BUCKET?endpoint=$ENDPOINT&region=$REGION&scheme=$SCHEME&virtual-style=false` — bare `s3://bucket` FAILS against RustFS (path-style required). Bake into one composition function; unit-test it (highest-risk pure logic).
- **Drop `--impure`** (was for NIXPKGS_ALLOW_* in old devbox flow; not needed for plain store copy), keep `--refresh`.
- **Single vs multi-user nix detection**: check `nix show-config | grep build-users-group` (empty = single-user). On multi-user without sudo: write extra-substituters to user config as hint + "ask admin to run configure", don't pretend success.
- **Use `jq`** (already a devbox package) to extract enabled `path:devbox.d/*` from devbox.json, not `grep -oE` (line 51 smell). Use `$(id -un)` not hardcoded `rodrigo` (line 27 smell).
- **upload-flakes**: keep 3-line shim `exec "$(dirname "$0")/cache" upload "$@"` for grace period.
- **Signing**: configure generates/installs nix secret key; upload signs (`nix store sign --key-file`); pullers get trusted-public-keys. (01 reopened.)


