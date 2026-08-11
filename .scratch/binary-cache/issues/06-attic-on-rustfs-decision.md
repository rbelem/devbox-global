# 06 - Attic on RustFS: server-side migration decision

Type: grilling + council
Status: resolved
Blocked by: 01-05 (resolved), backend lane (resolved)

## Question

The S3-direct backend (RustFS, ticket 01 + backend lane) works but is a raw
object store: no GC, no compression, no dedup, no server-side signing, no
fine-grained auth. Evaluate Attic (HTTP-protocol Nix cache server) as a
replacement front-end. What do we lose and gain? (Oracle review requested by
user; council consulted for implementation plan.)

## Answer

- **Oracle review (ses_011fce823ffeXJU0ebA5vbNSAE)**: STAY S3-direct — "minimum
  operational surface for the actual workload" (77 MiB convenience cache).
  Attic self-labels "early prototype" (163 open issues), had a fail-open
  integrity bug (#349), no presigned URLs (proxy bottleneck), DB migration
  burden, no GC-concurrency guarantees. Decision rule: revisit at bucket
  >10 GiB, Attic 1.0 + 6-12 months quiet, sharing the cache, UX friction, or
  egress cost.
- **USER OVERRODE 2026-08-10**: implement Attic on top of the existing RustFS
  (Attic's S3 storage backend → RustFS). Council (3 models: GLM-5.2, Qwen
  3.8 Max, Kimi K3) planned it; grilling session (user) settled the open
  decisions. Rationale accepted: server-side managed signing (pushers never
  see the key), JWT auth (no AWS creds on machines), FastCDC chunking +
  global dedup + zstd, standard HTTP binary-cache protocol.

## Council decisions (2-1 where split)

- Namespace: **reuse `cache`** (beta/gamma; alpha wanted new `attic`) —
  in-ns DNS `rustfs-service.cache.svc:9000`, existing deny-all-cache NetPol
  covers the pod.
- DB: **SQLite on dedicated 2Gi PVC** (beta/gamma) — Bitnami initdb runs only
  on first boot with empty data dir (PG live ⇒ helm-values edit is silent
  no-op); NetPol cross-ns needed for PG; zero concurrency benefit at 1
  replica; durability parity (same disk, restic deferred).
- Storage: S3 → RustFS in-cluster (`rustfs-service.cache.svc:9000`), no
  NodePort hairpin. `force_path_style` is HARDCODED true when endpoint set
  (server/src/storage/s3.rs:104) — not a config key.
- Bucket: **new `attic-cache`, NO versioning, NO object lock** (GC issues
  DeleteObject → 403 under GOVERNANCE; versioning fights GC).
- Config surface: **full `server.toml` rendered as a k8s Secret** by
  secrets-render.yml (Attic is config-file native; env-overrides unverified;
  keeps creds out of committed files).
- Probes: **tcpSocket 8080** (no health endpoint; `GET /` returns HTML 200 —
  usable for Kuma probe; `/devbox/nix-cache-info` 404s until cache exists).
- Image: **pin by digest** `ghcr.io/zhaofengli/attic:latest@sha256:18574aba70fc89d2b695273fbe2e7b2f8ad7e8e786b4cc535124fbe14bada1d0`
  (no tagged releases; nixpkgs 0-unstable-2026-07-06).
- Signing: Attic-managed per-cache keypair (DB-backed); client key
  `cache.zet.rclb.dev-1` retired.
- Migration: wipe + re-push (~77 MiB) — old objects format-incompatible AND
  signed with retired key.
- `bin/cache` rework in-place; delete all S3 code paths (no fallback —
  fallbacks rot).

## User decisions (grilling rounds 1-2)

- Q1 SQLite on 2Gi PVC (revisit if Attic scales horizontally).
- Q2 **Private cache** — pull via **JWT in `~/.config/nix/netrc`** (NOT AWS
  creds; Attic JWT with `--pull devbox` scope), push via JWT on workstation.
- Q3 Cleanup ≥30d gated (close S3 vhost, delete legacy bucket/users/SM keys).
- Q4 **URL `https://attic.zet.rclb.dev/devbox`** — NEW subdomain (SM
  DOMAIN_CONFIG += "attic" → tofu A record) + NEW Caddy vhost → 30083.
  `cache.zet.rclb.dev` KEEPS serving RustFS S3 (30081) until 30d cleanup —
  additive cutover, zero client breakage (oracle B2 resolved by naming, not
  sequencing); RustFS goes off-internet at cleanup.
- Q5 GC retention **14 days**.
- Q6 Backup SQLite minimum (cron + rsync to workstation).
- Q7 Uptime Kuma probe on `/devbox/nix-cache-info`.
- Q8 Single flip with frozen bucket 30d (manual rollback).
- Q9 Namespace `cache`.
- Q10 `bin/cache` in-place; **future: devbox fork with embedded client for
  any provider (cachix, neocache, etc.)** → thin provider-abstraction layer
  in script/ADR.
- Q11 Shared pull token via SM (configure writes netrc).
- Q12 HS256 (secret pre-deploy in SM).
- Q13 Token validity **1 year**.

## Facts locked (lib-3, official schema)

- `allowed-hosts = ["cache.zet.rclb.dev"]` REQUIRED in production.
- `[chunking]` REQUIRED (nar-size-threshold 65536, min 16384, avg 65536,
  max 262144 — changing breaks dedup).
- `[jwt.signing] token-hs256-secret-base64` (env fallback
  `ATTIC_SERVER_TOKEN_HS256_SECRET_BASE64`; old top-level key deprecated).
- Per-cache config (public/retention/upstream) via CLI
  `attic cache create/configure`, NOT server.toml.
- Duration format: humantime (`"14 days"`, `"12 hours"`).
- `attic-client` + `attic-server` exist in nixpkgs
  (0-unstable-2026-07-06); NixOS module exists (not used — k8s path).
- CLI: `atticadm make-token --sub X --validity "1y" --pull devbox --push devbox`;
  `attic cache create devbox --public=false --upstream-cache-key-name cache.nixos.org-1`;
  `attic cache info devbox`; `attic login`; `attic push <server>:<cache> <paths> [-j 5]`.
