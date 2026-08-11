# 03 - Config and schema extension

Type: grilling
Status: resolved
Blocked by: 01

## Question

How does configuration reach the script — extended devbox.json with a local
schema, or env vars only?

Sub-questions:

- **Fields**: if devbox.json, which — `nix.cache.uri`, `nix.cache.endpoint`,
  `nix.cache.bucket`, `nix.cache.region`, credential reference? Naming
  consistent with existing devbox.json structure.
- **Schema**: devbox-global pins
  `https://raw.githubusercontent.com/jetify-com/devbox/0.17.2/.schema/devbox.schema.json`.
  Local fork = copy schema into repo (e.g. `.schema/devbox.schema.json`),
  patch in the new fields, point `$schema` at the repo file. Validate: does
  hujson/devbox reject unknown top-level keys today, or ignore them?
- **Env fallback**: which knobs stay env-overridable (e.g. endpoint for CI)?
- **Friction bar**: user pref is "extend devbox.json and the schema if
  needed" — decide whether schema extension is actually needed or env+script
  defaults suffice.

## Answer

### devbox.json fields (snake_case, per devbox conventions)

```jsonc
"nix": {
  "cache": {
    "endpoint": "https://rustfs.example.com",
    "bucket": "devbox-nix-cache",
    "region": "us-east-1",       // default: us-east-1
    "scheme": "https",           // http for plain-HTTP LAN/VPS
    "path_style": true,          // MinIO/RustFS need path-style — REQUIRED
    "profile": "devbox-cache"    // aws profile name; keys NEVER in devbox.json
  }
}
```

- **No `uri` field** — it's derived: `s3://$BUCKET?endpoint=$ENDPOINT&region=$REGION&scheme=$SCHEME&virtual-style=false`. Having both uri and endpoint would be self-contradictory; script composes the URI (one function, unit-tested).
- **No credential reference field** — secrets don't live in devbox.json; `profile` names the aws config profile configure writes and upload targets.
- All fields optional with defaults (endpoint/bucket may come from env in CI); region default us-east-1.

### Schema fork: NO

Oracle verified: `validateConfig` (internal/devconfig/configfile/file.go:163-176) checks only nixpkgs commit length, script names, alias names — **no DisallowUnknownFields anywhere**. The pinned schema's `additionalProperties: false` is editor lint, not a runtime gate. A `nix.cache` block loads and runs whether the schema knows it or not.

Forking the pinned schema (0.17.2, already stale) purely to kill an editor squiggle = maintenance trap on every upstream bump. Skip; keep `$schema` pointing at upstream. If the squiggle becomes unbearable later, a minimal local fork that only patches the `nix` property is the fallback — not now.

### Env fallbacks (precedence: env > devbox.json > defaults)

| knob | env var | devbox.json | default |
|---|---|---|---|
| endpoint | `DEVBOX_CACHE_ENDPOINT` | `nix.cache.endpoint` | — |
| bucket | `DEVBOX_CACHE_BUCKET` | `nix.cache.bucket` | — |
| region | `DEVBOX_CACHE_REGION` | `nix.cache.region` | `us-east-1` |
| scheme | `DEVBOX_CACHE_SCHEME` | `nix.cache.scheme` | `https` |
| path_style | `DEVBOX_CACHE_PATH_STYLE` | `nix.cache.path_style` | `true` |
| profile | `DEVBOX_CACHE_PROFILE` | `nix.cache.profile` | `devbox-cache` |

Credentials stay AWS-standard: `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `AWS_ENDPOINT_URL_S3` env (SDK-v2 honored — old nixcache.go used aws-sdk-go-v2), or the aws profile written by configure.

### Machine trust (was "not yet specified")

Every pulling machine runs `configure` (writes nix.conf `extra-substituters` + `trusted-public-keys`, aws config, restart nix-daemon). Pusher additionally holds write keys. State explicitly in script help/docs.

