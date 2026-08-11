# ADR 0006: Self-hosted binary cache backend — RustFS on the zet VPS

> **Status: Superseded 2026-08-10 by [ADR 0007](./0007-attic-cache-frontend.md)**
> (Attic frontend on the RustFS backend). Originally accepted 2026-08-10
> as the backend lane of the binary-cache effort (map:
> `.scratch/binary-cache/map.md`, tickets 01-05). This ADR records the
> concrete deployment facts the `bin/cache` script consumed; the RustFS
> deployment remains in service as Attic's storage backend (see 0007).

## Context

Upstream devbox removed the Jetify Nix cache (commit `24a2e75f`,
PR #2940, 2026-08-04). The replacement is one devbox-global script
(`bin/cache`) backed by a self-hosted S3-protocol store. Ticket 01 chose
**RustFS** (S3-compatible, Apache-2.0, Rust) hosted on a **VPS**, with
static access keys, signed nars, and path-style access. Tickets 04/05
delivered the script + tests; the backend itself was left to this lane.

## Decision

Deploy **RustFS `1.0.0-rc.1`** (image `rustfs/rustfs:1.0.0-rc.1` on
Docker Hub — NOT the `ghcr.io/rustfs/rustfs:2026.7.1` tag from the
initial research, which does not exist) as a k3s workload on the zet
VPS, exposed publicly via Caddy + Cloudflare DNS.

### Deployment facts (what the script reads)

| Knob | Value | Notes |
|---|---|---|
| `endpoint` | `cache.zet.rclb.dev` | public, TLS via Caddy (HTTP-01) |
| `bucket` | `devbox-nix-cache` | object-lock + versioning enabled |
| `region` | `us-east-1` | RustFS default; nix s3 URI carries it |
| `scheme` | `https` | Caddy terminates TLS; RustFS plain http in-cluster |
| `path_style` | `true` | mandatory — bare `s3://bucket` fails against RustFS |
| `profile` | `devbox-cache` | aws profile written by `configure` to `~/.aws/config` |

Composed nix store URI (what the script bakes):

```
s3://devbox-nix-cache?endpoint=cache.zet.rclb.dev&region=us-east-1&scheme=https&virtual-style=false
```

### Topology

```
nix client (any machine) → https://cache.zet.rclb.dev (Caddy, TLS)
  → NodePort 30081 → rustfs pod (ns: cache) → local-path PVC 20Gi
Console: NodePort 30082 (host/tailnet ops only, not in Caddy)
```

- k3s namespace `cache`; deployment `rustfs` (1 replica, Recreate,
  s3:9000 + console:9001, /minio/health probes); PVC `rustfs-data`
  20Gi local-path.
- Caddy vhost `cache.zet.rclb.dev` is the **one public vhost** (Nix
  pullers are arbitrary machines); n8n/auth stay tailnet-gated.
  Firewall opens :443 to the internet for it.
- NetworkPolicies: `deny-all-cache` + `allow-node-to-rustfs`
  (node IP + pod CIDR) so host Caddy → NodePort works.
- DNS: `cache.zet.rclb.dev` A → 62.238.62.155 (Cloudflare, tofu
  `subdomains` list, record created via API during cutover because
  tofu was blocked by a pre-existing `hcloud_server.zet` image drift).

### Credentials (Bitwarden SM, project `zet`)

| SM key | Purpose | Scope |
|---|---|---|
| `RUSTFS_ADMIN_KEY` / `RUSTFS_ADMIN_SECRET` | RustFS admin (mc provisioning) | account-wide |
| `CACHE_PUSHER_KEY` / `CACHE_PUSHER_SECRET` | `cache-pusher` user | bucket read+write |
| `CACHE_PULLER_KEY` / `CACHE_PULLER_SECRET` | `cache-puller` user | bucket read-only |
| `CACHE_NIX_SIGNING_KEY` / `CACHE_NIX_PUBLIC_KEY` | nix nar signing | — |

Users are bucket-scoped via mc policies (`cache-pusher` =
GetObject/PutObject/DeleteObject/ListBucket; `cache-puller` =
GetObject/ListBucket). Keys reach machines via the rendered
`rustfs-admin` k8s Secret (ansible secrets-render/apply), never
committed.

### Nar signing

`nix key generate-secret-key --key-name cache.zet.rclb.dev-1`; secret
stored root-owned 0600 at `~root/.cache/devbox-cache/secret-key`
(mirrored user-level by `configure`); public key
`cache.zet.rclb.dev-1:/N8KOVXSWZ4MWkdW15CiGtbRjzdcGTFMfz88QWVVBFo=`
goes into `trusted-public-keys` on pulling machines. Signing is why
arbitrary machines can trust the cache without trusted-substituters
(reversal of ticket 01's original "no signing" per oracle review).

### Object lock / versioning

Bucket has versioning + object lock (GOVERNANCE, 1d default retention)
as belt-and-suspenders — a corrupted/overwritten nar cannot silently
replace a good one.

## Smoke test (validated live 2026-08-10)

- `nix copy --to 's3://...virtual-style=false'` of a signed closure
  with pusher creds → 0, full closure uploaded (multipart + path-style).
- `nix path-info --store 's3://...'` + `nix copy --from` into an
  isolated local store with puller creds → 0, closure pulled intact,
  nar signatures include `cache.zet.rclb.dev-1`.
- `bin/cache configure` (env pusher creds) → nix.conf + aws config +
  signing key written; `bin/cache status` resolves the URI.
- `bin/cache upload` → "added 179 signatures", 311 objects / 77MiB in
  bucket (devbox.d flake ✗ marks are local unbuilt-flake issues, not
  backend failures).

## Consequences

- **Positive**: full control of the cache backend; Apache-2.0 (no
  AGPL); S3-protocol drop-in for the removed Jetify cache; signing
  gives integrity to arbitrary pullers; object lock protects cache
  poisoning; 311 objects already live.
- **Negative**: RustFS is a young project — no long track record of
  nix-cache usage (mitigated by the live smoke test); single-node k3s
  = no erasure coding (rebuildable cache, acceptable); public S3
  endpoint is an additional attack surface (mitigated by scoped keys
  + TLS + signing + object lock); 20Gi PVC will need growth over time.
- **Ops notes**: bucket/keys provisioning uses `mc` (nix shell
  `nixpkgs#minio-client`) + `aws s3api` against the endpoint; the
  admin creds live in SM; `rustfs` console is host/tailnet only.

## References

- `.scratch/binary-cache/map.md` + issues 01-05 (effort map)
- zet repo: `k8s/manifests/rustfs/`, `ansible/playbooks/{caddy,
  secrets-render,secrets-apply,deploy}.yml`, `tofu/dns.tf`
- rustfs.com / docs.rustfs.com (S3 compatibility, env-var config)

## Status

**Superseded 2026-08-10 by [ADR 0007](./0007-attic-cache-frontend.md)** —
the Attic frontend replaces the S3-direct client path. The RustFS
deployment facts above remain valid as Attic's storage backend (new
bucket `attic-cache` via in-cluster `rustfs-service.cache.svc:9000`)
until the ≥30d cleanup; the S3 vhost `cache.zet.rclb.dev` stays live
through the 30-day coexistence window, then closes.
