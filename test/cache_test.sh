#!/usr/bin/env bash
# test/cache_test.sh — zero-dependency unit tests for bin/cache (ticket 08:
# Attic binary cache; no S3/RustFS paths).
#
# Harness: tiny pure-bash dispatcher (no bats/shunit2 — repo has no test
# infra; oracle: not worth a new devbox dep for ~a dozen small tests).
# Deps: bash + jq only (jq is already a devbox package).
#
# Sandboxing: every test runs in a subshell against a mktemp -d sandbox with
# HOME redirected there, so bin/cache can never touch real ~/.config/nix,
# /etc/nix/nix.conf, or /etc/nix/netrc. DEVBOX_CACHE_* / ATTIC_* env is
# cleared up front.
#
# PATH-stub approach: the attic/nix/devbox/bws binaries are stubbed as scripts
# in $SANDBOX/bin (put FIRST on PATH via with_stub_path). A stub records its
# argv to $SANDBOX/<name>.calls and then runs a canned body, so the tests are
# nix-free and never touch a real Attic server or Bitwarden SM.
#
# Explicitly NOT covered here (need root + a live store; manual smoke
# checklist instead — backend lane):
#   - real `attic push` against attic.zet.rclb.dev
#   - sudo paths (/etc/nix/nix.conf, /etc/nix/netrc)
#   - nix-daemon restart
#
# Run:  bash test/cache_test.sh
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CACHE_BIN="$HERE/../bin/cache"

# ── sandbox: never touch real config ─────────────────────────────────────────
SANDBOX="$(mktemp -d "${TMPDIR:-/tmp}/cache-test.XXXXXX")"
trap 'rm -rf "$SANDBOX"' EXIT
export HOME="$SANDBOX/home"
export SANDBOX   # visible to PATH-stub bodies at runtime
mkdir -p "$HOME"
DEVBOX_JSON="$SANDBOX/devbox.json"

unset_cache_env() {
  unset DEVBOX_CACHE_TYPE DEVBOX_CACHE_ENDPOINT DEVBOX_CACHE_CACHE \
    DEVBOX_CACHE_SERVER DEVBOX_CACHE_PUBKEY DEVBOX_CACHE_PUSH_TOKEN_ENV \
    DEVBOX_CACHE_PULL_TOKEN_ENV \
    ATTIC_PUSH_JWT ATTIC_PULL_JWT 2>/dev/null || true
}

# ── harness ──────────────────────────────────────────────────────────────────
PASS=0
FAIL=0
declare -a FAILED_TESTS=()

# Assertions return non-zero AND record the failure. Each test runs in a fresh
# subshell (see run_tests), so TESTS_FAILED starts at 0 per test; tests end
# with `return "$TESTS_FAILED"`. This is required because a subshell spawned
# in an `if` condition runs with errexit ignored (bash quirk — even `set -e`
# inside does not re-enable it), so a failing assertion alone cannot abort the
# test; the explicit flag + final return is what fails the test.
TESTS_FAILED=0

assert_eq() { # expected actual [msg]
  local expected="$1" actual="$2" msg="${3:-}"
  if [[ "$expected" == "$actual" ]]; then
    return 0
  fi
  TESTS_FAILED=1
  echo "    expected: [$expected]" >&2
  echo "    actual:   [$actual]" >&2
  [[ -n "$msg" ]] && echo "    $msg" >&2
  return 1
}

assert_contains() { # haystack needle [msg]
  local haystack="$1" needle="$2" msg="${3:-}"
  if [[ "$haystack" == *"$needle"* ]]; then
    return 0
  fi
  TESTS_FAILED=1
  echo "    '$needle' not found in:" >&2
  echo "    $haystack" >&2
  [[ -n "$msg" ]] && echo "    $msg" >&2
  return 1
}

# Run command in a nested subshell; it must exit 0. (The nested subshell
# isolates explicit `exit` calls in code under test, e.g. die().)
assert_success() {
  if ( "$@" ) >/dev/null 2>&1; then
    return 0
  fi
  TESTS_FAILED=1
  echo "    expected success: $*" >&2
  return 1
}

assert_failure() {
  if ( "$@" ) >/dev/null 2>&1; then
    TESTS_FAILED=1
    echo "    expected failure: $*" >&2
    return 1
  fi
  return 0
}

# Write a devbox.json fixture into the sandbox and point the script at it.
write_json() { printf '%s\n' "$1" > "$DEVBOX_JSON"; export DEVBOX_JSON_PATH="$DEVBOX_JSON"; }

# ── PATH stubs ───────────────────────────────────────────────────────────────

# Write a stub binary into $SANDBOX/bin: records "$@" to $SANDBOX/<name>.calls
# and then runs BODY (single-quote the body at the call site so $1/$@ stay
# literal; the stub's working dir is the sandbox, so "$SANDBOX" also expands
# at runtime).
make_stub() {
  local name="$1" body="$2"
  mkdir -p "$SANDBOX/bin"
  {
    printf '#!/usr/bin/env bash\n'
    printf 'SB="$(cd "$(dirname "$0")/.." && pwd)"\n'
    printf 'printf "%%s " "$@" >> "$SB/%s.calls"\n' "$name"
    printf 'printf "\\n" >> "$SB/%s.calls"\n' "$name"
    printf '%s\n' "$body"
  } > "$SANDBOX/bin/$name"
  chmod +x "$SANDBOX/bin/$name"
}

# Run a command with $SANDBOX/bin first on PATH.
with_stub_path() {
  PATH="$SANDBOX/bin:$PATH" "$@"
}

# The real devbox Attic cache shape (same values as devbox.json).
FIXTURE_ATTIC='{"nix":{"cache":{"type":"attic","endpoint":"https://attic.zet.rclb.dev","cache":"devbox","public_key":"devbox:CyW2CoFfBHdpRM4tWqnerpYK5aloECxoeWRULi0gsmo="}}}'

run_tests() {
  local tests=(
    test_block_rewrite_idempotent
    test_block_rewrite_replaces_stale_block
    test_flake_extraction
    test_flake_extraction_empty
    test_env_overrides_json
    test_defaults
    test_missing_json_fails
    test_configure_writes_block_and_netrc
    test_configure_idempotent
    test_configure_missing_attic_fails
    test_upload_invokes_attic_push
    test_upload_push_target_uses_config_server
    test_status_calls_cache_info
    test_status_pull_only_skips_cache_info
    test_netrc_path_both_modes
    test_unknown_type_fails
    test_provider_config_parse
  )
  local t
  for t in "${tests[@]}"; do
    if ( "$t" ); then
      PASS=$((PASS + 1)); echo "PASS  $t"
    else
      FAIL=$((FAIL + 1)); FAILED_TESTS+=("$t"); echo "FAIL  $t"
    fi
  done
}

# ── 1. marker-block rewrite: idempotent, merging, cache.nixos.org kept ───────

test_block_rewrite_idempotent() {
  local cfg="$SANDBOX/nix.conf"
  printf 'substituters = https://cache.nixos.org/\ntrusted-public-keys = cache.nixos.org-1:AAAA\n' > "$cfg"
  # shellcheck disable=SC2034 # consumed by sourced nix_block()/rewrite_managed_block()
  NIX_CONF_FILE="$cfg"
  NETRC_FILE="$HOME/.config/nix/netrc"
  CACHE_URI='https://attic.zet.rclb.dev/devbox'
  CACHE_PUBKEY='devbox:CyW2CoFfBHdpRM4tWqnerpYK5aloECxoeWRULi0gsmo='

  rewrite_managed_block "$cfg" "$(nix_block)"
  local run1; run1="$(cat "$cfg")"
  rewrite_managed_block "$cfg" "$(nix_block)"
  local run2; run2="$(cat "$cfg")"

  assert_eq "$run1" "$run2" 'second rewrite is byte-identical'
  assert_eq 1 "$(grep -c "$MARKER_BEGIN" "$cfg" || true)" 'begin marker appears once'
  assert_eq 1 "$(grep -c "$MARKER_END" "$cfg" || true)" 'end marker appears once'
  # pre-existing values preserved AND merged, not clobbered
  assert_contains "$run2" 'substituters = https://cache.nixos.org/'
  assert_contains "$run2" 'trusted-public-keys = cache.nixos.org-1:AAAA cache.nixos.org-1:6NCHdD59X431o0gWypbMrAURkbJ16ZPMQFGspcDShjY= devbox:CyW2CoFfBHdpRM4tWqnerpYK5aloECxoeWRULi0gsmo='
  assert_contains "$run2" "extra-substituters = https://attic.zet.rclb.dev/devbox"
  assert_contains "$run2" 'fallback = true'
  assert_contains "$run2" "netrc-file = $HOME/.config/nix/netrc"
  return "$TESTS_FAILED"
}

test_block_rewrite_replaces_stale_block() {
  # an old s3:// block (pre-attic era) is fully replaced, not accumulated
  local cfg="$SANDBOX/nix.conf"
  # shellcheck disable=SC2034 # consumed by sourced nix_block()/rewrite_managed_block()
  NIX_CONF_FILE="$cfg"
  NETRC_FILE="$HOME/.config/nix/netrc"
  CACHE_URI='s3://old?endpoint=old&region=r&scheme=http&virtual-style=false'
  # shellcheck disable=SC2034 # consumed by sourced nix_block()
  CACHE_PUBKEY='devbox-cache-1:OLD'
  rewrite_managed_block "$cfg" "$(nix_block)"

  CACHE_URI='https://attic.zet.rclb.dev/devbox'
  # shellcheck disable=SC2034 # consumed by sourced nix_block()
  CACHE_PUBKEY='devbox:CyW2CoFfBHdpRM4tWqnerpYK5aloECxoeWRULi0gsmo='
  rewrite_managed_block "$cfg" "$(nix_block)"

  local content; content="$(cat "$cfg")"
  assert_contains "$content" 'https://attic.zet.rclb.dev/devbox'
  assert_contains "$content" 'cache.nixos.org-1:6NCHdD59X431o0gWypbMrAURkbJ16ZPMQFGspcDShjY='
  assert_eq 0 "$(grep -c 's3://old' <<< "$content" || true)" 'stale s3 block removed'
  assert_eq 1 "$(grep -c "$MARKER_BEGIN" "$cfg" || true)" 'still exactly one block'
  return "$TESTS_FAILED"
}

# ── 2. devbox.json extraction via jq ─────────────────────────────────────────

test_flake_extraction() {
  write_json '{"packages":{"fzf":"latest","path:devbox.d/neovim":{},"path:devbox.d/rtk":"latest","valkey":{"version":"latest"}}}'
  assert_eq $'neovim\nrtk' "$(enabled_flake_names "$DEVBOX_JSON")"
  return "$TESTS_FAILED"
}

test_flake_extraction_empty() {
  write_json '{}'
  assert_eq '' "$(enabled_flake_names "$DEVBOX_JSON")"
  return "$TESTS_FAILED"
}

# ── 3. precedence: env > devbox.json > defaults ──────────────────────────────

test_env_overrides_json() {
  write_json '{"nix":{"cache":{"type":"attic","endpoint":"json.example.com","cache":"json-cache","server_name":"json-server","public_key":"json:AAAA","push_token_env":"JSON_PUSH","pull_token_env":"JSON_PULL"}}}'
  export DEVBOX_CACHE_ENDPOINT='env.example.com' DEVBOX_CACHE_CACHE='env-cache' \
    DEVBOX_CACHE_SERVER='env-server' \
    DEVBOX_CACHE_PUBKEY='env:BBBB' DEVBOX_CACHE_PUSH_TOKEN_ENV='ENV_PUSH' \
    DEVBOX_CACHE_PULL_TOKEN_ENV='ENV_PULL'
  load_json; resolve_config
  assert_eq 'env.example.com' "$CACHE_ENDPOINT"
  assert_eq 'env-cache' "$CACHE_NAME"
  assert_eq 'env-server' "$CACHE_SERVER"
  assert_eq 'env:BBBB' "$CACHE_PUBKEY"
  assert_eq 'ENV_PUSH' "$CACHE_PUSH_TOKEN_ENV"
  assert_eq 'ENV_PULL' "$CACHE_PULL_TOKEN_ENV"
  assert_eq 'https://env.example.com/env-cache' "$CACHE_URI"
  return "$TESTS_FAILED"
}

test_defaults() {
  write_json '{}'
  load_json; resolve_config
  assert_eq 'attic' "$CACHE_TYPE"
  assert_eq 'ATTIC_PUSH_JWT' "$CACHE_PUSH_TOKEN_ENV"
  assert_eq 'ATTIC_PULL_JWT' "$CACHE_PULL_TOKEN_ENV"
  return "$TESTS_FAILED"
}

# ── failure path ─────────────────────────────────────────────────────────────

test_missing_json_fails() {
  export DEVBOX_JSON_PATH="$SANDBOX/does-not-exist.json"
  assert_failure load_json
  return "$TESTS_FAILED"
}

# ── 4. PATH-stub integration: configure ──────────────────────────────────────

test_configure_writes_block_and_netrc() {
  make_stub attic 'exit 0'
  make_stub nix ''
  make_stub devbox 'printf %s\\n "$SANDBOX/global"'
  make_stub bws 'exit 1'
  write_json "$FIXTURE_ATTIC"
  export ATTIC_PULL_JWT='test-pull-token'

  assert_success with_stub_path cmd_configure

  local conf netrc
  conf="$(cat "$HOME/.config/nix/nix.conf")"
  assert_contains "$conf" 'extra-substituters = https://attic.zet.rclb.dev/devbox'
  assert_contains "$conf" 'cache.nixos.org-1:6NCHdD59X431o0gWypbMrAURkbJ16ZPMQFGspcDShjY='
  assert_contains "$conf" 'devbox:CyW2CoFfBHdpRM4tWqnerpYK5aloECxoeWRULi0gsmo='
  assert_contains "$conf" 'fallback = true'
  assert_contains "$conf" "netrc-file = $HOME/.config/nix/netrc"

  netrc="$HOME/.config/nix/netrc"
  assert_eq '600' "$(stat -c '%a' "$netrc")" 'netrc mode is 0600'
  assert_eq 'machine attic.zet.rclb.dev password test-pull-token' "$(cat "$netrc")"
  return "$TESTS_FAILED"
}

test_configure_idempotent() {
  make_stub attic 'exit 0'
  make_stub nix ''
  make_stub devbox 'printf %s\\n "$SANDBOX/global"'
  make_stub bws 'exit 1'
  write_json "$FIXTURE_ATTIC"
  export ATTIC_PULL_JWT='test-pull-token' ATTIC_PUSH_JWT='test-push-token'

  assert_success with_stub_path cmd_configure
  local conf1 netrc1
  conf1="$(cat "$HOME/.config/nix/nix.conf")"
  netrc1="$(cat "$HOME/.config/nix/netrc")"

  assert_success with_stub_path cmd_configure
  assert_eq "$conf1" "$(cat "$HOME/.config/nix/nix.conf")" 'nix.conf byte-identical across runs'
  assert_eq "$netrc1" "$(cat "$HOME/.config/nix/netrc")" 'netrc byte-identical across runs'
  return "$TESTS_FAILED"
}

test_configure_missing_attic_fails() {
  make_stub nix ''
  make_stub devbox 'printf %s\\n "$SANDBOX/global"'
  make_stub bws 'exit 1'
  # drop any attic stub left behind by earlier tests in this shared sandbox
  rm -f "$SANDBOX/bin/attic" "$SANDBOX/attic.calls"
  write_json "$FIXTURE_ATTIC"
  export ATTIC_PULL_JWT='test-pull-token'
  # no attic stub on PATH → preflight dies before anything is written
  assert_failure with_stub_path cmd_configure
  return "$TESTS_FAILED"
}

# ── 5. PATH-stub integration: upload + status ────────────────────────────────

test_upload_invokes_attic_push() {
  make_stub attic 'exit 0'
  make_stub nix 'case "$1" in
  path-info) printf %s\\n /nix/store/abc-def ;;
esac'
  make_stub devbox 'printf %s\\n "$SANDBOX/global"'
  make_stub bws 'exit 1'
  rm -f "$SANDBOX/attic.calls"   # hermetic: only this run's calls
  write_json '{"packages":{"path:devbox.d/testflake":{}},"nix":{"cache":{"type":"attic","endpoint":"https://attic.zet.rclb.dev","cache":"devbox","public_key":"devbox:CyW2CoFfBHdpRM4tWqnerpYK5aloECxoeWRULi0gsmo="}}}'
  export ATTIC_PUSH_JWT='test-push-token'
  mkdir -p "$SANDBOX/global/devbox.d/testflake"
  touch "$SANDBOX/global/devbox.d/testflake/flake.nix"

  assert_success with_stub_path cmd_upload

  local calls
  calls="$(cat "$SANDBOX/attic.calls")"
  assert_contains "$calls" 'push attic:devbox'
  assert_contains "$calls" '/nix/store/abc-def'
  return "$TESTS_FAILED"
}

test_upload_push_target_uses_config_server() {
  # SF1 regression: push target must derive from config (cache name here is
  # "staging", server default "attic") instead of the hardcoded attic:devbox.
  make_stub attic 'exit 0'
  make_stub nix 'case "$1" in
  path-info) printf %s\\n /nix/store/abc-def ;;
esac'
  make_stub devbox 'printf %s\\n "$SANDBOX/global"'
  make_stub bws 'exit 1'
  rm -f "$SANDBOX/attic.calls"   # hermetic: only this run's calls
  write_json '{"packages":{"path:devbox.d/testflake":{}},"nix":{"cache":{"type":"attic","endpoint":"https://attic.zet.rclb.dev","cache":"staging","public_key":"devbox:CyW2CoFfBHdpRM4tWqnerpYK5aloECxoeWRULi0gsmo="}}}'
  export ATTIC_PUSH_JWT='test-push-token'
  mkdir -p "$SANDBOX/global/devbox.d/testflake"
  touch "$SANDBOX/global/devbox.d/testflake/flake.nix"

  assert_success with_stub_path cmd_upload

  local calls
  calls="$(cat "$SANDBOX/attic.calls")"
  assert_contains "$calls" 'push attic:staging'
  assert_eq 0 "$(grep -c 'attic:devbox' <<< "$calls" || true)" 'target derived from config, not hardcoded'
  return "$TESTS_FAILED"
}

test_status_calls_cache_info() {
  make_stub attic 'exit 0'
  make_stub nix ''
  make_stub devbox 'printf %s\\n "$SANDBOX/global"'
  make_stub bws 'exit 1'
  rm -f "$SANDBOX/attic.calls"   # hermetic: only this run's calls
  write_json "$FIXTURE_ATTIC"
  # SF3: cache info only runs on the push-authorized path — export the token
  export ATTIC_PUSH_JWT='test-push-token'

  assert_success with_stub_path cmd_status
  assert_contains "$(cat "$SANDBOX/attic.calls")" 'cache info'
  return "$TESTS_FAILED"
}

test_status_pull_only_skips_cache_info() {
  # SF3 regression: no push token → status must NOT run `attic cache info`
  # (it would fail without client auth); it reports pull-only and goes
  # straight to the curl liveness check.
  make_stub attic 'exit 0'
  make_stub nix ''
  make_stub devbox 'printf %s\\n "$SANDBOX/global"'
  make_stub bws 'exit 1'
  make_stub curl 'exit 0'
  rm -f "$SANDBOX/attic.calls"   # hermetic: only this run's calls
  write_json "$FIXTURE_ATTIC"
  unset ATTIC_PUSH_JWT ATTIC_PULL_JWT

  local out
  out="$(with_stub_path cmd_status 2>/dev/null)"
  assert_contains "$out" 'pull-only'
  assert_eq '' "$(cat "$SANDBOX/attic.calls" 2>/dev/null || true)" 'cache info must not run without a push token'
  return "$TESTS_FAILED"
}

# ── 6. pure functions ────────────────────────────────────────────────────────

test_netrc_path_both_modes() {
  ROOT_MODE=1
  assert_eq '/etc/nix/netrc' "$(netrc_path)"
  ROOT_MODE=0
  assert_eq "$HOME/.config/nix/netrc" "$(netrc_path)"
  ROOT_MODE=0
  return "$TESTS_FAILED"
}

test_unknown_type_fails() {
  write_json '{"nix":{"cache":{"type":"cachix","endpoint":"https://cachix.example.com","cache":"x"}}}'
  load_json
  assert_failure resolve_config
  return "$TESTS_FAILED"
}

test_provider_config_parse() {
  write_json '{"nix":{"cache":{"type":"attic","endpoint":"attic.zet.rclb.dev","cache":"devbox","public_key":"devbox:CyW2CoFfBHdpRM4tWqnerpYK5aloECxoeWRULi0gsmo="}}}'
  load_json; resolve_config
  assert_eq 'attic' "$CACHE_TYPE"
  assert_eq 'attic' "$CACHE_SERVER" 'server default'
  assert_eq 'https://attic.zet.rclb.dev/devbox' "$CACHE_URI"
  assert_eq 'devbox:CyW2CoFfBHdpRM4tWqnerpYK5aloECxoeWRULi0gsmo=' "$CACHE_PUBKEY"
  assert_eq 'ATTIC_PUSH_JWT' "$CACHE_PUSH_TOKEN_ENV" 'push token env default'
  assert_eq 'ATTIC_PULL_JWT' "$CACHE_PULL_TOKEN_ENV" 'pull token env default'

  write_json '{"nix":{"cache":{"type":"attic","endpoint":"https://attic.zet.rclb.dev","cache":"devbox","server_name":"staging","public_key":"devbox:AAAA","push_token_env":"MY_PUSH","pull_token_env":"MY_PULL"}}}'
  load_json; resolve_config
  assert_eq 'staging' "$CACHE_SERVER" 'server from json'
  assert_eq 'MY_PUSH' "$CACHE_PUSH_TOKEN_ENV" 'push token env override'
  assert_eq 'MY_PULL' "$CACHE_PULL_TOKEN_ENV" 'pull token env override'
  return "$TESTS_FAILED"
}

# ── main ─────────────────────────────────────────────────────────────────────

# shellcheck source=../bin/cache
source "$CACHE_BIN"   # defines functions only (main() guarded by BASH_SOURCE check)

unset_cache_env
run_tests

echo
if (( FAIL == 0 )); then
  echo "All $PASS tests passed."
else
  echo "FAILED: $FAIL of $((PASS + FAIL)) tests: ${FAILED_TESTS[*]}"
  exit 1
fi
