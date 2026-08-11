# Map: Self-hosted binary cache for devbox-global

## Destination

Replace the removed `devbox cache` with ONE low-friction devbox-global script
(configure + upload combined), backed by a self-hosted binary cache — **Attic
frontend (HTTP protocol) on a RustFS S3 backend** — config optionally carried
by an extended devbox.json (+ local schema), covered by unit tests.
`bin/cache upload` pushes the global closure and devbox.d flakes; other
machines pull with plain nix.

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
- [06 - Attic on RustFS decision](issues/06-attic-on-rustfs-decision.md) — **RESOLVED**: user override of the oracle's "stay S3-direct" — Attic frontend on the existing RustFS (Attic's S3 storage backend → RustFS). Council + grilling settled Q1-Q13: PRIVATE cache (JWT netrc pull, push JWT), additive vhost `attic.zet.rclb.dev`, SQLite on 2Gi PVC, bucket `attic-cache` (no lock/versioning), retention 14d, HS256 1y tokens, ns `cache`, digest-pinned image, in-place `bin/cache` rework with provider abstraction.
- [07 - Attic server-side](issues/07-attic-server-side.md) — **RESOLVED**: atticd deployed in ns `cache` (NodePort 30083), full `server.toml` as k8s Secret, bucket `attic-cache` + `attic-server` user (`attic-cache-rw` policy), admin/push/pull JWTs + pubkey in SM; smoke passed (push + private pull, 401 without token, Kuma probe with JWT).
- [08 - Attic client rework](issues/08-attic-client-rework.md) — **IN PROGRESS**: `bin/cache` reworked in place (configure/upload/status kept; provider config shape `{type, endpoint, cache, public_key, push_token_env, pull_token_env}`; all S3 code paths deleted — no fallbacks); `attic-client` package in devbox.json; netrc root/user mode (B8); cold-machine token hand-carry (B9); one revertable commit (B10). Cutover in progress — additive vhost coexistence; cleanup gated ≥30d.

## Not yet specified

- Nothing open: 01-05 resolved (backend facts below), 06-08 resolved/
  in progress (Attic lane below). Remaining gates: cutover of remaining
  machines (08 P8.5) and the ≥30d cleanup (08 P8.6).

## Backend lane (RESOLVED 2026-08-10 — superseded by the Attic lane)

> The facts below are the S3-direct deployment (ADR 0006). The RustFS
> deployment remains as Attic's storage backend (bucket `attic-cache`,
> in-cluster `rustfs-service.cache.svc:9000`); the S3 vhost stays live
> through the 30-day coexistence window, then closes (ADR 0007).

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
- **Facts recorded**: ADR 0006 (superseded by 0007) + devbox.json
  `nix.cache.*` (legacy S3 shape).

## Attic lane (IN PROGRESS 2026-08-10 — server deployed, client reworked, cutover in progress)

User overrode the oracle's "stay S3-direct" recommendation: implement **Attic
on top of the existing RustFS** (Attic S3 storage backend → RustFS). Council
(3 models) planned it; grilling (user) settled the open decisions (Q1-Q13).
Ticket state: **06 resolved** (decisions), **07 resolved** (deployed +
smoke-passed), **08 in progress** (client reworked, cutover). See
[06 - Attic on RustFS decision](issues/06-attic-on-rustfs-decision.md),
[07 - Attic server-side](issues/07-attic-server-side.md),
[08 - Attic client rework](issues/08-attic-client-rework.md).

**Architecture** — Attic frontend on the RustFS S3 backend:

```
nix client → https://attic.zet.rclb.dev/devbox (Caddy TLS, additive vhost)
  → NodePort 30083 → atticd (ns cache) → SQLite 2Gi PVC
  → RustFS S3 in-cluster (rustfs-service.cache.svc:9000, bucket attic-cache)
```

- **Additive vhost coexistence window (30d)**: `attic.zet.rclb.dev` (NEW
  subdomain: SM DOMAIN_CONFIG += "attic", tofu 1 A-record, Caddy → 30083)
  serves Attic while `cache.zet.rclb.dev` KEEPS serving RustFS S3 (30081) —
  zero client breakage (oracle B2 resolved by naming); S3 clients flip only
  when configured; rollback = point clients back. RustFS S3 goes fully
  internal at cleanup.
- **Namespace** `cache`; **SQLite** on 2Gi PVC; **bucket `attic-cache`** (NO
  lock/versioning — GC needs DeleteObject); NodePort **30083**; image pinned
  by digest; probes tcpSocket; full `server.toml` as k8s Secret.
- **Private cache**: pull via **JWT netrc** (NOT AWS creds), push JWT on
  workstation; HS256, **1y** validity; admin/push/pull JWTs + pubkey in SM
  (`ATTIC_*`). Cache `devbox`; upstream filter `cache.nixos.org-1`; signing
  Attic-managed (`cache.zet.rclb.dev-1` retired); migration = wipe + re-push
  (~77 MiB).
- **GC retention 14 days**; Kuma probe with pull JWT; SQLite backup
  (cron+rsync); cutover = single flip with legacy bucket frozen 30d; cleanup
  ≥30d gated (close `cache` vhost + DNS, delete legacy bucket/users, retire
  CACHE_* + CACHE_NIX_* SM keys, remove client signing key).
- **`bin/cache`** reworked in place with a thin provider-abstraction layer
  (future: devbox fork with embedded multi-provider client — cachix,
  neocache, etc.); all S3 code paths deleted (no fallbacks). Public key
  committed in devbox.json (recovery artifact). **ADR 0007 accepted —
  supersedes 0006.**

## Out of scope

- Re-adding `devbox cache` to upstream jetify-com/devbox — this effort is
  devbox-global-side only.
- ~~Cachix/Attic/Harmonia HTTP caches~~ — **superseded**: Attic is now the
  front-end (tickets 06-08); Cachix/Harmonia remain out of scope (future
  providers slot into the same devbox.json config shape, Q10).
- S3-direct client path — **superseded**: `bin/cache` has no S3 code paths
  (no fallbacks — fallbacks rot); the RustFS S3 endpoint survives only as
  Attic's in-cluster storage backend and the legacy vhost during the 30d
  coexistence window.
