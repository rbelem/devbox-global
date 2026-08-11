# 01 - Credential and backend decision

Type: grilling
Status: resolved
Blocked by:

## Question

Which storage backend, hosted where, with which credential source, and with or
without nar signing?

Sub-questions:

- **Backend**: MinIO vs Garage vs plain AWS S3 vs existing infra already in
  the nix-config repo? (100%-compat bar says S3 protocol; which object store)
- **Host**: podman container on a known machine? Which one? Single-user or
  multi-user nix on that host matters for where nix.conf edits land.
- **Credentials**: static access keys in `~root/.aws/config`, or
  `credential_process` pointing at a helper script (the old devbox pattern),
  or env vars? Who holds the keys — bitwarden?
- **Signing**: sign uploaded nars with a nix secret key (`nix store sign` /
  secret-key-files) so any machine can trust the cache without
  trusted-substituters, or skip signing and rely on per-machine
  trusted-substituters? Key storage location if signed?

Blocked-by note: every later ticket (script design, schema fields, tests)
assumes the backend + creds + signing answer.

## Answer

- **Backend**: **RustFS** — open-source, Apache-2.0, distributed object storage
  built in Rust, S3-compatible, positioned as drop-in MinIO replacement.
  Researched 2026-08-10 (rustfs.com, docs.rustfs.com/features/s3-compatibility,
  milvus.io blog). Meets the 100% S3-protocol compatibility bar; nix `s3://`
  store should work via standard S3 ops + `AWS_ENDPOINT_URL_S3`.
  Risk: young project, no known nix-binary-cache usage reports — mitigate with
  a manual `nix copy --to s3://...` smoke test on the VPS during 04
  implementation (validates multipart + list ops).
- **Host**: VPS / remote host. Concrete facts (which VPS, bucket name,
  endpoint URL) are implementation details — config fields on ticket 03.
- **Credentials**: static keys written once to `~root/.aws/config` by
  configure, PLUS env-var overrides per run (`AWS_ACCESS_KEY_ID` /
  `AWS_SECRET_ACCESS_KEY` / `AWS_ENDPOINT_URL_S3`) for CI/ad-hoc. Both paths.
- **Signing**: none. Machines pull via `trusted-substituters`; pusher adds
  cache URI to nix.conf. No nix secret key.

## REOPENED 2026-08-10 (oracle review): signing reversed

Oracle review (ses_0130051e0ffe79M1WcXl6j0KSu) flagged: trusted-substituters
restricts auto-apply only, gives NO integrity; unsigned bucket = every store
object trusted as root on every pulling machine; compromised RustFS = RCE on
all machines. User decision: **SIGN NARS**.

- `nix key generate-secret-key` once at configure time; key in `~root/`
  (root-owned, chmod 600) or bitwarden (bws already used in this repo).
- Upload signs each path: `nix store sign --key-file <key>` before `nix copy`
  (or `nix copy --sign`).
- Pullers get `trusted-public-keys = <pubkey>` in nix.conf from configure.
- Redact `AWS_SECRET_ACCESS_KEY` in script trace; read keys via here-doc/stdin,
  never argv (`/proc`/`ps` visible).


