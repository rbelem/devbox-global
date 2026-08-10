# Map: Self-hosted binary cache for devbox-global

## Destination

Replace the removed `devbox cache` with ONE low-friction devbox-global script
(configure + upload combined), backed by a self-hosted S3-protocol store,
config optionally carried by an extended devbox.json (+ local schema), covered
by unit tests. `devbox global run upload-flakes` (or its successor) pushes the
global closure and devbox.d flakes; other machines pull with plain nix.

## Notes

Domain: bash scripts, nix.conf, nix `s3://` store protocol, AWS
credential_process, devbox.json schema, S3/MinIO/Garage. Skills: grilling,
domain-modeling, devbox-global-adr-format (ADRs live in docs/adr/).

Effort overrides planning-only: the user asked for execution too — final
tickets (04, 05) deliver the script and tests, not just decisions.

Standing prefs (user): single combined script, minimal friction, extend
devbox.json + schema if needed, unit tests.

### Findings (fed 2026-08-10, from jetify-com/devbox session)

- Upstream devbox removed the Jetify Nix cache in commit `24a2e75f`
  (PR #2940, merged 2026-08-04), first of five "account-free" PRs. Deleted:
  `devbox cache` tree (upload/copy, configure, credentials, enable, info),
  `internal/devbox/providers/nixcache`, `internal/setup` sudo framework,
  `nix.IncludeDevboxConfig`/`restartDaemon`, the S3 narinfo probe, the nightly
  `cache-upload` workflow. Kept: `nix.CurrentConfig`/`Config.IsUserTrusted`.
- Jetify cache was S3-backed — nix native `s3://` protocol, NOT cachix HTTP.
  Upload = `nix copy --to s3://<uri> --impure --refresh <installable>` with
  AWS creds as env vars (`internal/nix/cache.go`). Pull = `nix build
  --extra-substituters s3://<uri>` + `credential_process` in
  `~root/.aws/config` pointing at `devbox cache credentials`. Auth was
  short-lived creds fetched from the Jetify API — the ONLY Jetify-specific
  seam; everything else was generic nix+S3.
- 100% compatible replacement = any S3-compatible store (MinIO / Garage /
  Ceph RGW / plain S3). Cachix/Attic/Harmonia are HTTP-protocol caches —
  substituter-compatible but not the Jetify wire protocol; ruled out.
- Current `bin/upload-flakes` calls `devbox cache configure/upload/info` —
  broken on devbox main. Needs rewrite to `nix copy` + scripted configure.
- Piece mapping: upload → `nix copy --to s3://...`; configure → sudo append
  trusted-users + write `~root/.aws/config`; credentials → static keys or
  credential_process; enable → `extra-substituters` in nix.conf; info →
  `nix path-info` / narinfo curl. Persistent nix.conf config replaces the old
  silent per-build injection (that existed only for short-lived creds).
- MinIO endpoint: nix `s3://` store honors `AWS_ENDPOINT_URL_S3` env or
  `endpoint_url` in the aws config profile.
- Upstream schema: `jetify-com/devbox/.schema/devbox.schema.json`
  (devbox-global currently pins 0.17.2).

## Decisions so far

- [01 - Credential and backend decision](issues/01-credential-and-backend.md) — RustFS on a VPS (S3-compatible, open-source); static keys in `~root/.aws/config` + env overrides; no nar signing, trusted-substituters. **REOPENED + reversed 2026-08-10 (oracle): SIGN NARS** (`nix store sign --key-file`; trusted-public-keys on pullers; secret key in ~root/ or bitwarden).
- [02 - Single script design](issues/02-script-design.md) — one `bin/cache` script with subcommands (configure/upload/status); upload = flakes + global closure; sudo when available with user-level fallback; devbox.json is config source of truth, configure writes nix.conf + aws config (nix can't read devbox.json; upstream flake.nix has no nixConfig); upload-flakes retired (3-line shim grace). + oracle corrections: daemon restart after trusted-users, marker-block idempotent config, s3 URI composition with path-style, drop --impure keep --refresh, jq + $(id -un), single-vs-multi-user detection.
- [03 - Config and schema extension](issues/03-config-and-schema.md) — devbox.json `nix.cache.{endpoint,bucket,region,scheme,path_style,profile}` (snake_case, no uri field — derived `s3://$BUCKET?endpoint=…&virtual-style=false`; no credential field — profile only). NO schema fork: devbox ignores unknown keys at runtime (verified validateConfig), fork is editor-cosmetic + maintenance trap. Env fallbacks `DEVBOX_CACHE_*` (env > devbox.json > defaults). Every pulling machine runs configure.
- [04 - Implement the combined script](issues/04-implement-script.md) — `bin/cache` delivered (configure/upload/status/help, ~590 lines, verified bash -n + shellcheck + 23 unit assertions + sandboxed idempotent configure). devbox.json `cache` script entry; upload-flakes shim. Deviations: root-mode upload parity ([default] aws mirror + user key copy), DEVBOX_CACHE_PUBKEY distribution, upload exits 1 on flake failure, closure upload with zero flakes, jq path_style false gotcha. Live `nix copy` smoke test deferred to backend lane.
- [05 - Unit tests for the script](issues/05-unit-tests.md) — zero-dep `test/cache_test.sh` (no bats — not worth a devbox dep), 12 tests covering URI composition, marker-block idempotency, jq flake extraction, env precedence; 12/12 pass + negative control proves harness catches failures. bin/cache factored `enabled_flake_names()` for testability. Manual smoke checklist (live RustFS, sudo, daemon) documented.

## Not yet specified

- Which VPS, bucket name, endpoint URL — backend lane deliverable (facts for devbox.json config). Effort otherwise complete: 01-05 resolved.

## Backend lane (RESOLVED 2026-08-10)

- **Host**: zet VPS (62.238.62.155, Ubuntu 24.04 + k3s). RustFS
  `rustfs/rustfs:1.0.0-rc.1` (Docker Hub) deployed as k3s workload,
  namespace `cache`, NodePorts 30081 (S3) / 30082 (console).
- **Endpoint**: `https://cache.zet.rclb.dev` (public, Caddy TLS,
  the one non-gated vhost); DNS A record via Cloudflare.
- **Bucket**: `devbox-nix-cache`, region us-east-1, versioning +
  object lock (GOVERNANCE 1d).
- **Keys**: SM `CACHE_PUSHER_*` (bucket rw) + `CACHE_PULLER_*`
  (bucket ro) + `RUSTFS_ADMIN_*` (admin) + `CACHE_NIX_SIGNING_KEY`/
  `CACHE_NIX_PUBLIC_KEY`.
- **Signing**: `cache.zet.rclb.dev-1` key generated; pubkey
  `cache.zet.rclb.dev-1:/N8KOVXSWZ4MWkdW15CiGtbRjzdcGTFMfz88QWVVBFo=`.
- **Smoke test**: nix copy push (pusher) + pull (puller) into isolated
  store validated; `bin/cache configure/status/upload` live.
- **Facts recorded**: ADR 0006 + devbox.json `nix.cache.*`.

## Out of scope

- Re-adding `devbox cache` to upstream jetify-com/devbox — this effort is
  devbox-global-side only.
- Cachix/Attic/Harmonia HTTP caches — wrong wire protocol for the 100%
  compatibility bar.
