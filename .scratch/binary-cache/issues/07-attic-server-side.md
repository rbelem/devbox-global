# 07 - Attic server-side implementation (zet repo)

Type: implementation
Status: open — REVISED 2026-08-10 after oracle review (ora-2)
Blocked by: 06 (resolved)

## Goal

Deploy Attic on the zet VPS k3s cluster (ns `cache`), storage = RustFS
S3 backend (bucket `attic-cache`), public endpoint
`https://attic.zet.rclb.dev/devbox` (**PRIVATE** cache — pull via JWT netrc),
NodePort 30083. **NEW additive subdomain+vhost**: `cache.zet.rclb.dev` keeps
serving RustFS S3 until the 30d cleanup (oracle B2 resolved by naming, not
sequencing).

## Decisions (from 06 + oracle review — do not re-litigate)

- Namespace `cache` (reuse; in-ns DNS `rustfs-service.cache.svc:9000`).
- SQLite DB on dedicated 2Gi PVC (`/data/server.db?mode=rwc`).
- Bucket `attic-cache`: NO versioning, NO object lock.
- Config: full `server.toml` rendered as k8s Secret by secrets-render.yml.
- Probes tcpSocket 8080; image pinned by digest.
- NodePort 30083; Caddy vhost `cache.zet.rclb.dev` target 30081→30083.
- **PRIVATE cache**: `attic cache create --public=false` (oracle B4 — Attic
  caches default PUBLIC; the vhost is internet-exposed, so omitting this flag
  = world-readable cache. Security bug fixed).
- Pull JWT (netrc) + push JWT (workstation); HS256; 1y validity.
- Retention 14 days (server.toml default + explicit `--retention-period` at
  create — oracle N4); GC interval "12 hours".
- Kuma probe on `/devbox/nix-cache-info` **with pull JWT** (oracle B6 —
  private cache returns 401 without it).

## Oracle-review fixes applied (ora-2)

- **B1 SM key names**: repo convention = UPPERCASE_SNAKE_CASE (vault.yml
  rule). Keys are `ATTIC_TOKEN_HS256_SECRET`, `ATTIC_S3_ACCESS_KEY`,
  `ATTIC_S3_SECRET_KEY`, `ATTIC_ADMIN_JWT`, `ATTIC_PUSH_JWT`,
  `ATTIC_PULL_JWT`, `ATTIC_CACHE_PUBLIC_KEY`. (`scripts/bws-get` matches
  exact names.)
- **B3 phase reorder**: deploy + bootstrap + smoke via NodePort/port-forward
  BEFORE the Caddy flip. Caddy never proxies to a nonexistent pod (no 502
  window).
- **B5 cache create via the CLIENT, not atticd**: `atticadm -f ... make-token`
  for tokens (adm takes the config); cache management is client-side —
  `attic login` with the admin token, then `attic cache create`. `attic`
  (client) must NEVER read server.toml (it holds DB creds + JWT secret).
  Verify exact CLI surface against the pinned image before writing the
  runbook (`kubectl exec deploy/attic -- attic --help`).
- **N1 NetPol in the ROOT file**: append `allow-node-to-attic` to
  `k8s/manifests/networkpolicies.yaml` (deploy.yml applies it via an explicit
  dedicated block — per-app netpol files silently no-op).
- **N2 mc target**: P1 targets `https://cache.zet.rclb.dev` (the S3 vhost,
  which never flips under the new naming — the additive vhost makes this a
  non-issue; still document the in-cluster alternative).
- **B2 vhost naming**: NEW `attic.zet.rclb.dev` vhost + DNS record (additive);
  `cache.zet.rclb.dev` continues serving RustFS S3 → 30081 until 30d cleanup.
  No same-session client breakage, no 502 window, rollback = point clients
  back.

## Phases

### P0 — SM keys (operator)

Create in SM project `zet` (UPPERCASE_SNAKE_CASE per vault.yml):
- `ATTIC_TOKEN_HS256_SECRET` — `openssl rand -base64 48` (PRE-deploy; JWTs
  regenerable after DB loss)
- `ATTIC_S3_ACCESS_KEY` / `ATTIC_S3_SECRET_KEY` — placeholders now, real
  after P1 write-back
- `ATTIC_ADMIN_JWT`, `ATTIC_PUSH_JWT`, `ATTIC_PULL_JWT` — placeholders now,
  real after P5 write-back
- `ATTIC_CACHE_PUBLIC_KEY` — placeholder now, real after P5

### P1 — RustFS provisioning (new script `scripts/rustfs-provision-attic.sh`)

Workstation-side, mc against `https://cache.zet.rclb.dev` with RUSTFS admin
creds (SM). MUST be a committed script. The S3 vhost never flips under the
additive naming (B2) — no pre-flip constraint; the vhost serves S3 until 30d
cleanup.

```bash
mc mb rustfs/attic-cache                                   # NO --with-lock, NO --with-versioning
mc admin user add rustfs attic-server <key> <secret>       # scoped user
# policy: rw on attic-cache only (GetObject/PutObject/DeleteObject/ListBucket)
mc admin policy attach rustfs <attic-cache-rw> --user attic-server
# GUARD: assert retention empty + no versioning (footgun protection)
mc retention info rustfs/attic-cache   # must say "not enabled"
```

Write-back key/secret → SM. Verify: `mc ls rustfs/attic-cache` as
`attic-server`; idempotent re-run.

### P2 — k8s manifests (new dir `k8s/manifests/attic/`)

- **deployment.yaml**: `image: ghcr.io/zhaofengli/attic:latest@sha256:18574aba70fc89d2b695273fbe2e7b2f8ad7e8e786b4cc535124fbe14bada1d0`,
  1 replica, Recreate, port 8080 (`http`), probes tcpSocket (liveness+
  readiness), resources requests 100m/256Mi limits 1cpu/1Gi, securityContext
  fsGroup 10000 + seccomp RuntimeDefault + automountServiceAccountToken
  false, `command: ["atticd"]`, `args: ["--config", "/etc/attic/server.toml"]`,
  volumeMounts: config Secret → /etc/attic/server.toml (subPath), PVC → /data.
  Ops note: subPath Secret mount does NOT hot-reload — credential rotation
  needs `kubectl rollout restart deploy/attic -n cache` (N5).
- **service.yaml**: NodePort 30083 → 8080, selector app: attic.
- **pvc.yaml**: `attic-data`, 2Gi, local-path, RWO.
- **NO committed secret.yaml** (full-config-Secret pattern).
- **networkpolicies.yaml** (ROOT file, append — N1): `allow-node-to-attic`
  (ns cache, selector app: attic, ipBlocks 62.238.62.155/32 + 10.42.0.0/16),
  mirroring `allow-node-to-rustfs`. Storage path needs nothing (existing
  allow covers 10.42.0.0/16; single-node flannel preserves pod source IPs).

### P3 — ansible wiring (zet repo)

- `ansible/vault.yml`: add 7 rows (ATTIC_TOKEN_HS256_SECRET,
  ATTIC_S3_ACCESS_KEY, ATTIC_S3_SECRET_KEY, ATTIC_ADMIN_JWT, ATTIC_PUSH_JWT,
  ATTIC_PULL_JWT, ATTIC_CACHE_PUBLIC_KEY) to the SM key table. ALSO add
  deprecated rows for CACHE_PUSHER_*, CACHE_PULLER_*, CACHE_NIX_SIGNING_KEY,
  CACHE_NIX_PUBLIC_KEY (marked retired-in-08; auditability — oracle N10).
- `ansible/playbooks/secrets-render.yml`: fetch+assert each (RustFS pattern),
  render `.rendered/k8s-secrets/cache-attic-server-config-secret.yaml`
  (Secret `attic-server-config`, ns cache, key `server.toml`, FULL config
  below). Do NOT render a host-file for the pull token (N3 — it's a CLIENT
  secret; the VPS doesn't need it; bin/cache reads SM directly). Update
  summary.
- `ansible/playbooks/secrets-apply.yml`: add the rendered Secret to copy +
  apply loops + summary. NO pull-token host-file.
- `ansible/playbooks/deploy.yml`: add `attic` to manifest-dirs loop + a
  Deploy Attic find/apply/wait block (mirror RustFS block; NO excludes
  needed — no placeholder secret).
- `ansible/inventory/hosts.yml.tmpl` + SM `DOMAIN_CONFIG` subdomains: add
  `"attic"` (NEW subdomain — the additive vhost; `cache` stays for S3 until
  cleanup). `tofu/dns.tf` needs no code change (for_each over subdomains) —
  run `fetch_vault.sh` then `tofu apply`, expect exactly 1 create.

**server.toml content** (rendered; credentials from SM):

```toml
listen = "[::]:8080"
allowed-hosts = ["attic.zet.rclb.dev"]

[database]
url = "sqlite:///data/server.db?mode=rwc"

[storage]
type = "s3"
region = "us-east-1"
bucket = "attic-cache"
endpoint = "http://rustfs-service.cache.svc:9000"

[storage.credentials]
access_key_id = "{{ attic_s3_access_key }}"
secret_access_key = "{{ attic_s3_secret_key }}"

[chunking]
nar-size-threshold = 65536
min-size = 16384
avg-size = 65536
max-size = 262144

[compression]
type = "zstd"
level = 8

[garbage-collection]
interval = "12 hours"
default-retention-period = "14 days"

[jwt.signing]
token-hs256-secret-base64 = "{{ attic_token_hs256_secret }}"
```

Note (N4): `default-retention-period` here is the server-wide default; the
per-cache override is passed explicitly at `cache create` (P5).

### P4 — deploy + verify (was P5)

`deploy.sh --skip-tofu --skip-caddy` order: fetch_vault → secrets-render →
secrets-apply → deploy. Verify: pod Ready (migrations ran), logs show S3
backend connected (credentials/endpoint typo fails HERE, not at cutover).

### P5 — bootstrap (runbook, kubectl exec)

```bash
# 1. tokens (1y validity; HS256) — atticadm DOES take the config
kubectl exec deploy/attic -n cache -- atticadm -f /etc/attic/server.toml \
  make-token --sub admin --validity "1y" --pull devbox --push devbox \
  --create-cache devbox --configure-cache devbox --configure-cache-retention devbox
kubectl exec deploy/attic -n cache -- atticadm -f /etc/attic/server.toml \
  make-token --sub workstation --validity "1y" --push devbox
kubectl exec deploy/attic -n cache -- atticadm -f /etc/attic/server.toml \
  make-token --sub puller --validity "1y" --pull devbox

# 2. cache create — CLIENT path (attic never reads server.toml; B5).
#    Login with the admin token first, then create.
kubectl exec deploy/attic -n cache -- attic login attic.zet.rclb.dev \
  <ATTIC_ADMIN_JWT> --set-default
kubectl exec deploy/attic -n cache -- attic cache create devbox \
  --public=false \                                  # B4: PRIVATE (default is PUBLIC!)
  --upstream-cache-key-name cache.nixos.org-1 \
  --retention-period "14 days"                      # explicit per-cache (N4)

# 3. pubkey
kubectl exec deploy/attic -n cache -- attic cache info devbox
```

Write-back admin/push/pull tokens + pubkey → SM. Verify exact CLI surface
against the pinned image FIRST (attic --help / atticadm --help in-pod).

### P6 — smoke via NodePort / port-forward (BEFORE the new vhost is live)

The new `attic.zet.rclb.dev` vhost is additive — nothing flips, but validate
Attic before DNS/Caddy point at it. Reach Attic via port-forward:

```bash
ssh rodrigo@62.238.62.155 'kubectl port-forward -n cache svc/attic-service 30083:8080' &   # tunnel
# push (workstation, push token)
attic login attic.zet.rclb.dev "$ATTIC_PUSH_JWT" && attic push attic.zet.rclb.dev/devbox <hello>
# private pull check — narinfo requires token (401 without)
curl -fsS -H "Authorization: Bearer $ATTIC_PULL_JWT" http://127.0.0.1:30083/devbox/nix-cache-info
# narinfo Sig: devbox:... validates against pubkey
# cold-ish pull: netrc with pull JWT + substituter http://127.0.0.1:30083/devbox
```

### P7 — DNS + Caddy for the NEW vhost (additive) + public re-smoke + Kuma

1. SM `DOMAIN_CONFIG` subdomains += `"attic"` → `fetch_vault.sh` → `tofu apply`
   (expect exactly 1 A-record create for `attic.zet.rclb.dev`).
2. `ansible/playbooks/templates/caddy/Caddyfile.j2`: NEW vhost block:
   ```
   attic.zet.rclb.dev {
       # PRIVATE cache — pull requires JWT (netrc at the nix layer); TLS here.
       # Nix substituter for the Attic binary cache (NodePort 30083).
       reverse_proxy localhost:30083
   }
   ```
   `cache.zet.rclb.dev` block UNTOUCHED (still → 30081 RustFS S3). Update
   `caddy.yml` header table. Run caddy.yml (fresh HTTP-01 cert).
3. **No client breakage** (additive vhost): old S3 clients keep working on
   `cache.zet.rclb.dev`; clients flip to Attic at their own pace (08 P8.5).
   Rollback = point clients back; no Caddy revert needed.
4. Public re-smoke: `curl -fsS -H "Authorization: Bearer $ATTIC_PULL_JWT"
   https://attic.zet.rclb.dev/devbox/nix-cache-info` → 200.
5. Kuma probe on `https://attic.zet.rclb.dev/devbox/nix-cache-info` **with
   the pull JWT** (B6 — private cache 401s without it; add AFTER cache
   exists).

## Verify (definition of done)

- Pod Ready; migrations ran; S3 backend connected.
- Push + private pull work end-to-end (narinfo signed `devbox:`); 401 without
  token (cache truly private).
- SM has all 7 keys populated (no placeholders).
- Kuma monitor green (with JWT).
- DNS: `attic.zet.rclb.dev` A record exists (tofu applied); `cache.zet.rclb.dev`
  UNCHANGED (still S3 → 30081).
- Caddy: new `attic.zet.rclb.dev` vhost → 30083; `cache.zet.rclb.dev` vhost
  untouched.

## Risks

- Attic "early prototype": pin digest; watch #349-class issues; Kuma probe.
- Keypair in SQLite + no restic: Q6 backup (cron sqlite3 .backup → rsync to
  workstation) — see 08; pubkey recorded in ADR 0007.
- Bucket footgun: NO lock/versioning guard in P1 script.
- GC on SQLite serializes: interval 12h; never manual GC against live DB.
- **Additive vhost removes the B2 breakage**: `cache.zet.rclb.dev` (S3) and
  `attic.zet.rclb.dev` (Attic) run side by side for 30d; clients flip at
  their own pace; rollback = point clients back (no Caddy revert).
