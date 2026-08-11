# ADR 0007: Attic as the devbox binary-cache frontend

> **Status: Accepted 2026-08-10.** Frontend lane of the binary-cache
> effort (map: `.scratch/binary-cache/map.md`, tickets 06-08).
> Supersedes ADR 0006: the RustFS backend stays, Attic becomes the
> client-facing frontend on top of it.

## Context

ADR 0006 chose RustFS S3-direct as the binary-cache backend: nix's
native `s3://` store protocol against a public Caddy-terminated
endpoint, with static AWS access keys and a signing key on every
pulling machine. Hands-on use exposed the coupling costs: S3-direct
leaks AWS credential handling into every pulling machine, has no auth
story for a public-ish cache, and pushes signing-key management (key
generation, distribution, root-mirroring) onto every machine.

User override 2026-08-10: implement **Attic on top of the existing
RustFS** — Attic's S3 storage backend points at the in-cluster RustFS,
so the backend investment (ADR 0006) is retained while the
client-facing side becomes Attic's standard HTTP binary-cache protocol
with server-side signing, JWT auth, FastCDC chunking + dedup + zstd.
Council (3 models) planned it; a grilling session (user) settled the
open decisions (Q1-Q13, ticket 06).

## Decision

Deploy **atticd** in the `cache` k8s namespace on the zet cluster, S3
backend on the existing RustFS (bucket `attic-cache`, dedicated
`attic-server` user + `attic-cache-rw` policy), served publicly at
`https://attic.zet.rclb.dev` via Caddy. The vhost is **additive** —
`cache.zet.rclb.dev` keeps serving RustFS S3 through a 30-day
coexistence window. Cache name `devbox`, **PRIVATE** (pull via JWT in
nix netrc; push via JWT), retention 14 days, upstream cache
`cache.nixos.org` (key name `cache.nixos.org-1`), HS256 JWT tokens
(admin/push r+w, pull read).

### Topology

```
nix client (any machine) → https://attic.zet.rclb.dev/devbox (Caddy, TLS)
  → NodePort 30083 → atticd pod (ns: cache) → SQLite 2Gi PVC
  → RustFS S3 in-cluster (rustfs-service.cache.svc:9000, bucket attic-cache)
Legacy S3 path (coexistence window only):
  → https://cache.zet.rclb.dev (Caddy) → NodePort 30081 → rustfs pod
```

- k3s namespace `cache` (reused; existing `deny-all-cache` NetPol
  covers the pod, plus `allow-node-to-attic` for host Caddy → NodePort).
- Image digest-pinned
  `ghcr.io/zhaofengli/attic:latest@sha256:18574aba70fc89d2b695273fbe2e7b2f8ad7e8e786b4cc535124fbe14bada1d0`
  — no tagged releases (N9).
- SQLite DB on dedicated 2Gi PVC (`/data/server.db?mode=rwc`); config
  `server.toml` rendered as a k8s Secret by secrets-render.yml (full
  config; creds never committed).
- Bucket `attic-cache`: **NO versioning, NO object lock** — GC needs
  DeleteObject (403 under GOVERNANCE).
- DNS: `attic.zet.rclb.dev` A → VPS (tofu; SM `DOMAIN_CONFIG` +=
  "attic"). `cache.zet.rclb.dev` untouched during the window.
- Caddy vhost `attic.zet.rclb.dev` → 30083 (additive block);
  `cache.zet.rclb.dev` → 30081 remains until cleanup.
- Probes tcpSocket 8080 (no health endpoint); Uptime Kuma probe on
  `/devbox/nix-cache-info` **with the pull JWT** (private cache 401s
  without it).

### Cache (`devbox`)

- **PRIVATE** (`attic cache create devbox --public=false` — Attic
  caches default to PUBLIC and the vhost is internet-exposed, so
  omitting this flag = world-readable cache).
- Retention **14 days** (explicit `--retention-period "14 days"` at
  create; server-wide GC interval 12h in server.toml).
- Upstream filter: `--upstream-cache-key-name cache.nixos.org-1` —
  paths already signed by cache.nixos.org are skipped on push.
- Signing: Attic-managed per-cache keypair (DB-backed); the S3-era
  `cache.zet.rclb.dev-1` key is retired.
- Migration: wipe + re-push (~77 MiB) — old objects are
  format-incompatible AND signed with the retired key.

### Client: `bin/cache` rework

Reworked in place (configure/upload/status verbs kept); **all S3 code
paths deleted — no fallbacks (fallbacks rot)**. Provider-abstraction
config shape in devbox.json:

```json
"nix": { "cache": {
  "type": "attic",
  "endpoint": "https://attic.zet.rclb.dev",
  "cache": "devbox",
  "public_key": "devbox:CyW2CoFfBHdpRM4tWqnerpYK5aloECxoeWRULi0gsmo=",
  "push_token_env": "ATTIC_PUSH_JWT",
  "pull_token_env": "ATTIC_PULL_JWT"
}}
```

Env fallbacks `DEVBOX_CACHE_*` preserved for CI/ad-hoc (env >
devbox.json > defaults). Attic is provider `attic` today; future
providers (cachix, neocache) slot into the same shape — the thin
abstraction anticipates a devbox fork with an embedded multi-provider
client.

### Token model

Tokens are never committed; config names env vars (`push_token_env` /
`pull_token_env`, defaults `ATTIC_PUSH_JWT` / `ATTIC_PULL_JWT`), read
from env or SM (bws) at runtime. HS256
(`ATTIC_TOKEN_HS256_SECRET` in SM, pre-deploy), 1y validity. **HS256
rotation invalidates ALL tokens at once — rotate deliberately.**
`attic login` receives the push token as a positional argument (the
attic CLI has no stdin/env option), so it is briefly visible in `ps`
on multi-user machines with untrusted users; run configure on
single-user workstations or tolerate the window.

### netrc root/user mode (B8)

- multi-user nix (nix-daemon): `/etc/nix/netrc` (root, 0600) +
  `netrc-file = /etc/nix/netrc` in nix.conf — the **daemon** reads
  this, not `~/.config/nix/netrc`.
- single-user: `~/.config/nix/netrc`.
- `attic login` alone is insufficient (writes user nix.conf only, no
  netrc, no root path).
- The script **owns** the nix netrc file — it is fully rewritten on
  each configure (no marker block); pre-existing netrc entries for
  other services are not preserved.

### Marker-block bug (fixed)

The old S3 block wrote `trusted-public-keys = <existing>` which, with
no explicit line present, clobbered the implicit default and dropped
`cache.nixos.org-1`. The attic block always re-adds
`cache.nixos.org-1:6NCHdD59X431o0gWypbMrAURkbJ16ZPMQFGspcDShjY=` plus
`fallback = true` (cache outage → source build, not hard fail).

### Recovery artifact

The cache public key is **committed** in devbox.json
(`devbox:CyW2CoFfBHdpRM4tWqnerpYK5aloECxoeWRULi0gsmo=`) — losing the
server config does not lose pull-ability. Server-side pubkey recovery:
atticd storage (RustFS bucket) + SM `ATTIC_CACHE_PUBLIC_KEY`.

### Grilling decisions (Q1-Q13, ticket 06)

| # | Decision |
|---|---|
| Q1 | SQLite on dedicated 2Gi PVC (revisit if Attic scales horizontally) |
| Q2 | **PRIVATE cache** — pull via JWT in nix netrc (NOT AWS creds), push via JWT on workstation |
| Q3 | Cleanup ≥30d gated (close S3 vhost, delete legacy bucket/users/SM keys) |
| Q4 | **Additive vhost** `attic.zet.rclb.dev` — new subdomain + vhost; `cache.zet.rclb.dev` keeps serving S3 until cleanup (zero client breakage) |
| Q5 | GC retention 14 days |
| Q6 | SQLite backup minimum: cron + rsync to workstation |
| Q7 | Uptime Kuma probe on `/devbox/nix-cache-info` (with pull JWT) |
| Q8 | Single flip with frozen bucket 30d (manual rollback) |
| Q9 | Namespace `cache` (reuse) |
| Q10 | `bin/cache` in-place rework + thin provider abstraction (future: devbox fork, embedded multi-provider client) |
| Q11 | Shared pull token via SM (configure writes netrc) |
| Q12 | HS256, secret pre-deployed in SM |
| Q13 | Token validity 1 year |

Council-decided facts that shaped this ADR: single-node k3s (SQLite
over PG — zero concurrency benefit at 1 replica; in-cluster S3 via
`rustfs-service.cache.svc:9000`, no NodePort hairpin; `force_path_style`
is hardcoded true in Attic when an endpoint is set); **no Ingress** —
Caddy + NodePort pattern, consistent with the rest of the zet cluster;
full `server.toml` rendered as a k8s Secret; storage-path NetPol
covered by the existing in-cluster allow.

### Rollback (B10)

Server-side rollback: unfreeze the legacy bucket (`mc anonymous set
download rustfs/devbox-nix-cache`), remove the `attic.zet.rclb.dev`
Caddy vhost + DNS record, revert devbox.json `nix.cache` to the S3
shape (or keep the Attic client and switch the endpoint back). S3
clients never stopped working during the coexistence window — they
only flip when configured.

Honest caveat: `bin/cache` was never committed to git (neither the old
S3 form nor the new Attic form), so the S3-direct implementation is
**not recoverable from git** — a rollback of the client means either
reconstructing the S3 script from ADR 0006's description or accepting
cache.nixos.org-only substitution during the window (`fallback =
true` + `cache.nixos.org-1` guarantee builds never hard-fail).

### Cleanup (gated ≥30d after cutover)

After audit (zero `s3://devbox-nix-cache` / `cache.zet.rclb.dev`
references on any machine): close `cache.zet.rclb.dev` (Caddy vhost +
DNS record), delete bucket `devbox-nix-cache`, delete RustFS users
`cache-pusher` / `cache-puller`, retire SM keys `CACHE_PUSHER_*` /
`CACHE_PULLER_*` / `CACHE_NIX_SIGNING_KEY` / `CACHE_NIX_PUBLIC_KEY`,
remove the root-mirrored client signing key. RustFS S3 goes fully
internal. **ADR 0006 fully superseded.**

## Consequences

- **Positive**: private cache with an actual auth story; no AWS creds
  anywhere; server-side signing (pushers never see the key); provider
  abstraction for future frontends; committed pubkey recovery
  artifact; additive cutover with reversible server-side rollback
  (client caveat in Rollback — S3 script not recoverable from git);
  upstream-cache filtering + FastCDC dedup + zstd on the wire.
- **Negative**: private-cache tax — cold machines have no SM/bws, so
  the pull JWT must be hand-carried to the netrc (operator step;
  deliberate, documented cost of privacy); attic client is 0-unstable
  (CLI surface kept minimal: `login`/`push`/`cache info`; the devbox
  flake lock is the effective pin — N9); HS256 rotation invalidates
  all tokens at once; an extra service (atticd) to operate alongside
  RustFS; 77 MiB re-push migration.

## References

- [ADR 0006](./0006-self-hosted-binary-cache-backend.md) — superseded (RustFS backend facts; storage layer retained as Attic's backend)
- `.scratch/binary-cache/issues/06-attic-on-rustfs-decision.md` — grilling decisions Q1-Q13 + council
- `.scratch/binary-cache/issues/07-attic-server-side.md` — server-side implementation (zet repo)
- `.scratch/binary-cache/issues/08-attic-client-rework.md` — client rework + cutover + cleanup
- Attic docs: https://docs.attic.rs
- RustFS (storage backend): https://rustfs.com (S3-compatible)

## Status

Accepted 2026-08-10. Supersedes ADR 0006. Frontend lane deliverable:
Attic server deployed + smoke-passed (07), `bin/cache` reworked (08),
cutover in progress; cleanup gated ≥30d.
