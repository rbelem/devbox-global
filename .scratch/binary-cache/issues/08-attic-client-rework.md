# 08 - bin/cache rework to Attic + cutover (devbox-global)

Type: implementation
Status: open — REVISED 2026-08-10 after oracle review (ora-2)
Blocked by: 07 (server-side deployed + smoke-passed)

## Goal

Rework `bin/cache` from the S3-direct path to the Attic HTTP path, add a thin
provider-abstraction layer (future: devbox fork with embedded multi-provider
client — cachix, neocache, etc.), cut over machines, then clean up the legacy
S3 stack after the 30d gate.

## Decisions (from 06 + oracle review — do not re-litigate)

- PRIVATE cache: pull via JWT in netrc, push via JWT on workstation. NO AWS
  creds anywhere.
- URL `https://attic.zet.rclb.dev/devbox` (NEW additive vhost — oracle B2
  resolved by naming: `cache.zet.rclb.dev` keeps serving RustFS S3 until 30d
  cleanup; no same-session breakage).
- `bin/cache` rework IN PLACE (keep configure/upload/status verbs). Delete
  ALL S3 code paths — no fallback (fallbacks rot).
- Provider-abstraction layer: config shape is provider-agnostic (`type`,
  `endpoint`, `cache`, `publicKey`, `token*`); Attic is provider `attic` for
  now; future providers (cachix, neocache) slot in via the same config.
- ADR 0007 (new) supersedes 0006; map.md update.
- Q6: SQLite backup cron (server-side; referenced for pubkey recovery).

## Oracle-review fixes applied (ora-2)

- **B7 devbox.json package, NOT nix profile install**: add `"attic-client":
  "latest"` to devbox.json packages (repo manages everything via devbox.json —
  bws, jq, bitwarden-cli). configure does `command -v attic || die
  "attic-client missing — run devbox global pull"`, never mutates the system
  nix profile.
- **B8 netrc root/user mode**: replicate bin/cache's existing multi-user
  logic — multi-user (nix-daemon): `/etc/nix/netrc` (root, 0600) +
  `netrc-file = /etc/nix/netrc` in nix.conf (the DAEMON reads this, not
  `~/.config/nix/netrc`); single-user: `~/.config/nix/netrc`. `attic use`
  alone is NOT enough (writes user nix.conf only, no netrc, no root path).
- **B9 cold-machine token path**: hand-carry the pull JWT to the cold machine
  (explicit operator step — it has no SM/bws). Private-cache tax; surface in
  ADR 0007.
- **B10 rollback preconditions**: bin/cache rework MUST be one clean
  revertable commit; checklist below.
- **N7 tests**: DELETE S3-composition tests (functions die with the S3 path),
  ADD attic tests (PATH-stub attic CLI, netrc assertions, provider-config
  parse).
- **N8 workstation consumes BOTH tokens**: netrc from pull token (builds),
  upload from push token. Explicit in configure/upload.
- **N9 version skew**: server digest-pinned, client floats on nixpkgs — note
  in ADR 0007 (flake lock = effective pin).
- **N10 vault.yml**: CACHE_* keys were NEVER in vault.yml's table (only ADR
  0006) — add them as deprecated rows in 07 P3 for auditable retirement.

## Phases

### P8.1 — devbox.json config shape

```json
"nix": {
  "cache": {
    "type": "attic",
    "endpoint": "https://attic.zet.rclb.dev",
    "cache": "devbox",
    "public_key": "devbox:<pubkey-from-attic-cache-info>",
    "push_token_env": "ATTIC_PUSH_TOKEN",
    "pull_token_env": "ATTIC_PULL_TOKEN"
  }
}
```

- `public_key` committed (it's public) — recovery artifact.
- `*_token_env` names env vars; script reads token from env or SM (bws),
  never commits tokens.
- Env fallbacks `DEVBOX_CACHE_*` preserved for CI/ad-hoc.
- packages: add `"attic-client": "latest"` (B7).

### P8.2 — bin/cache rework (in place)

- **configure**:
  - `command -v attic || die "attic-client missing — run devbox global pull"` (B7).
  - Write the nix.conf marker block (idempotent, existing pattern):
    `substituters += https://attic.zet.rclb.dev/devbox`,
    `trusted-public-keys += devbox:...`, `fallback = true` (cache outage →
    source build, not hard fail).
  - **netrc per B8**: multi-user → `/etc/nix/netrc` (root, 0600) +
    `netrc-file = /etc/nix/netrc`; single-user → `~/.config/nix/netrc`.
    Content: `machine attic.zet.rclb.dev password <ATTIC_PULL_TOKEN>`.
  - `attic login attic.zet.rclb.dev <push-token>` for the workstation upload
    path (client auth state; attic push doesn't read netrc).
  - DELETE: S3 URI builder, `~/.aws/config` writer, signing-key generation,
    old marker blocks for the s3:// endpoint.
- **upload**: `attic push attic.zet.rclb.dev/devbox <paths...>` (closure
  computation, upstream-signed skip via the cache's
  `--upstream-cache-key-name cache.nixos.org-1`, parallel `-j`, progress).
  Push token from `ATTIC_PUSH_TOKEN` env or SM (N8).
- **status**: `attic cache info attic.zet.rclb.dev/devbox` (+ optional
  curl `/devbox/nix-cache-info` with pull token for liveness).
- **help**: update command text.

### P8.3 — test/cache_test.sh

- DELETE S3-composition tests (URI builder, scheme stripping, path-style,
  aws_section) — they test deleted functions (N7).
- ADD: PATH-stub `attic` CLI → configure writes marker block + netrc
  (idempotent); upload invokes `attic push` with right URI; status calls
  `attic cache info`; netrc assertions (multi-user vs single-user paths);
  provider-config parse for a non-attic provider shape (forward-compat).

### P8.4 — ADR + map

- `docs/adr/0007-attic-cache-frontend.md` (NEW): user override of the
  S3-direct recommendation, Attic-on-RustFS architecture, grilling decisions
  (Q1-Q13), pubkey (recovery artifact), provider-abstraction future, private-
  cache tax (token hand-carry, B9), version skew (N9), netrc root/user mode
  (B8). Supersede 0006 (status line).
- `.scratch/binary-cache/map.md`: tickets 06-08 resolution, updated
  architecture, "Out of scope" fix.

### P8.5 — cutover (NO same-session pressure — additive vhost)

**Rollback preconditions (B10) — verify BEFORE starting cutover:**
1. bin/cache rework is ONE clean revertable commit (no mixed changes).
2. Old bucket `devbox-nix-cache` non-empty, frozen
   (`mc anonymous set none`), objects + creds intact.
3. `RUSTFS_ADMIN_KEY/SECRET` + `CACHE_PUSHER/PULLER` still in SM.
4. Caddy Caddyfile.j2 change reversible (additive vhost → remove one block).

1. **Pre-flip**: `bin/cache upload` of the full devbox-global closure via
   attic (re-push ~77MiB; paths still local).
2. Flip workstation: `bin/cache configure` → full `devbox global` rebuild as
   soak. **No degradation anywhere** — `cache.zet.rclb.dev` (S3) still live
   for any un-flipped consumer; both vhosts coexist (oracle B2 resolved).
3. Flip remaining machines: `bin/cache configure` each (pull token via SM or
   hand-carry B9).
4. Cold-machine test: no AWS creds, no attic config → hand-carry pull JWT to
   netrc → `nix build nixpkgs#hello` substitutes from
   `https://attic.zet.rclb.dev/devbox`.
5. Freeze legacy bucket (if not done): `mc anonymous set none`.

**Rollback** (only if soak fails):
- `git revert <rework-commit>` on devbox-global (restores S3 path),
- `mc anonymous set download rustfs/devbox-nix-cache` (unfreeze),
- remove the `attic.zet.rclb.dev` Caddy block + DNS record,
- revert devbox.json nix.cache.
All preconditions in place ⇒ rollback is 4 commands; **S3 clients never
stopped working** during the whole window (they only flip when configured).

### P8.6 — cleanup (≥30 days after cutover, GATED)

Only after cold-machine test passed + **audit C1**:
- `rg 's3://devbox-nix-cache'` across `/etc/nix`, `~/.config/nix`, `~/.aws`,
  devbox.json on every machine → zero hits.
- `rg 'compose_cache_uri|aws_section|CACHE_URI' bin/cache` → zero hits.
- `rg 'cache.zet.rclb.dev'` in devbox.json / bin/cache / nix.conf on every
  machine → zero hits (no S3-direct consumer remains).

Then:
- **Close `cache.zet.rclb.dev` entirely**: remove the Caddy vhost block +
  remove `"cache"` from SM DOMAIN_CONFIG subdomains → `tofu apply` destroys
  the A record. RustFS S3 goes fully internal (NodePort host/tailnet only) —
  the security dividend (gamma's pushback, adopted).
- Delete bucket `devbox-nix-cache`.
- Delete RustFS users `cache-pusher` / `cache-puller`.
- Retire SM keys `CACHE_PUSHER_*`, `CACHE_PULLER_*`,
  `CACHE_NIX_SIGNING_KEY`/`CACHE_NIX_PUBLIC_KEY` (deprecated rows already in
  vault.yml per N10).
- Remove root-mirrored client signing key `~/.cache/devbox-cache/secret-key`
  (and root copy).
- ADR 0006 marked fully superseded; map.md cleanup complete.

## Verify (definition of done)

- `bin/cache configure/upload/status` work against Attic; zero S3 references
  in bin/cache.
- Cold-machine substitution succeeds with hand-carried netrc pull token only.
- All machines flipped; soak rebuild passed; `cache.zet.rclb.dev` (S3) and
  `attic.zet.rclb.dev` (Attic) coexisted through the window.
- 30d later: audit C1 clean; legacy bucket/users/SM keys gone; `cache` vhost
  + DNS record destroyed (RustFS S3 fully internal).
- ADR 0007 + map.md accurate.

## Risks

- Attic client CLI surface may drift (0-unstable) — devbox.json pins via
  flake lock (N9).
- Token rotation: HS256 rotation invalidates all — document in ADR 0007.
- Cutover window: fallback=true + cache.nixos.org → builds never hard-fail.
- Rollback path depends on the single-commit discipline — enforce at review.
