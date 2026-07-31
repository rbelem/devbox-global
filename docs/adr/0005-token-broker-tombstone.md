# ADR 0005: Token broker daemon — REJECTED

> **Status: Rejected 2026-07-30.** Originally proposed in Phase 7
> planning ("forthcoming ADR-0005" forward-referenced from
> ADR-0002:109). Reopened here to document the rejection and the
> concrete trigger that would justify re-evaluating.

## Context

A long-lived daemon (`bitwd`) was proposed to broker Bitwarden access
tokens across multiple `bitw` invocations via D-Bus (`GET_TOKEN`,
`LOCK`, `STATUS`). The motivating pain was: every parallel `bitw` call
would independently call `ensureToken()` → `loginApiKey()` → POST
`/connect/token` when the cached access token expired (~3600s TTL).
With client_credentials (no refresh token), that is one HTTP POST per
invocation per hour. A broker would centralize token refresh in one
process.

The secrets-agent alternative — a long-lived daemon holding the
**master key** and exposing `DECRYPT`/`ENCRYPT` over the wire — was
considered and rejected at planning time on both security and
complexity grounds (see ADR-0002:109).

## Decision

**Do not build the token broker.** The architecture already routed
around it:

| Original pain | What already solved it | Where |
|---|---|---|
| Per-process interactive master-password re-auth | libsecret master-pw cache | ADR-0002; `crypto.go:97-119` |
| Per-process token re-acquisition | `data.json` caches `AccessToken` + `TokenExpiry` + `ensureToken` fast path | `main.go:412-432` |
| Re-auth cost when token **is** expired | `client_credentials` = one silent HTTP POST, no prompt | `auth.go:168-179` |
| Multi-process vault reads contending | `bitw cache` does sync + decrypt + write in **one process** | `cache.go:75-88`; ADR-0004 |

A daemon would buy avoidance of ~1 HTTP POST/hour and pay for it with
a new single point of failure (daemon down ⇒ every `bitw` call fails),
a lifecycle to manage (`systemd --user` unit), re-entry into the
D-Bus namespace we are leaving (Phase 7a removed `dbus.go`), and a
stale-state problem on master-password rotation. The in-memory token
also dies on daemon restart, so `bitwd` must re-read `data.json`
anyway — at which point it is `ensureToken` with extra steps.

## Reopen condition

Re-evaluate only with evidence of real multi-process token contention
in practice. Concrete trigger: ≥2 concurrent long-lived `bitw`
consumers on the same machine hitting Bitwarden identity-endpoint
rate limits (HTTP 429) on their hourly re-auths. Until that signal,
the stateless CLI is the right architecture.

## Consequences

- **Positive**: no new daemon lifecycle, no D-Bus re-entry, no
  master-password-rotation coherence problem. Stateless CLI matches
  the rest of the devbox-global design (no long-lived daemons for the
  other tools either).
- **Negative**: parallel `bitw` invocations still do independent
  re-auths when the cached token is expired. Documented as a known
  limitation in ADR-0003 §Known limitations. Worth revisiting if the
  trigger above ever fires.

## References

- ADR-0002 §Forward references — the "forthcoming ADR-0005" note this
  ADR closes out
- ADR-0003 §Runtime token lifecycle + §Known limitations — the
  current model and its documented race / contention characteristics
- ADR-0004 — full `bw` → `bitw` CLI parity migration arc (Phase 7a
  removed `dbus.go`; this ADR closes the broker concept that would
  have re-entered D-Bus)
- Fork commit `b82e2b4` — `feat(cache): sync vault before building
  cache file` (the single-process decrypt that removes the
  multi-process contention the broker was designed for)
- Fork commit `0e36e87` — `chore(db): delete dbus.go + serve command
  (Phase 7a)` (the D-Bus removal this rejection tombstone pairs with)

## Status

Rejected 2026-07-30. See Reopen condition above.
