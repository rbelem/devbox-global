{
  description = "bitw - Bitwarden D-Bus Secret Service provider (rbelem fork, libsecret unlock)";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { self, nixpkgs }:
    let
      systems = [ "x86_64-linux" ];
      forAllSystems = nixpkgs.lib.genAttrs systems;
    in
    {
      packages = forAllSystems (system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
        in
        rec {
          bitw = pkgs.buildGoModule {
            pname = "bitw";
            # mvdan/bitw never published a tagged version. Use 0.1.0 as the
            # implicit baseline for the nix package metadata. The wire-protocol
            # Bitwarden-Client-Version header sent to BW servers (api.go) is a
            # separate constant `clientVersion` in api.go (currently "2026.7.0",
            # matching the upstream `bitwarden/clients` CLI per round-2 oracle review).
            version = "0.1.0";

            src = pkgs.fetchFromGitHub {
              owner = "rbelem";
              repo = "bitw";
              # Bump together with the upstream commit SHA on rbelem/bitw master.
              # b82e2b4 (Phase 4 bitw cache sync: cmdCache now calls ensureToken
              #          + sync at the start, mirroring the bash bin/secrets-refresh
              #          preflight. Without sync, cmdCache only saw ciphers
              #          present in data.json at startup — missing any created
              #          since (via `bitw create` or the web UI). This makes
              #          `bitw cache` a true drop-in for bin/secrets-refresh;
              #          the bash wrapper is deleted in this devbox-global
              #          commit. New TestCache_CallsSync is the regression
              #          guard (asserts cmdCache calls /sync, not stale in-mem
              #          data). 64/64 tests pass.
              # 638e8fd (Phase 3 bitw create: new `bitw create <name> [--notes
              #          NOTES] [--field NAME=VALUE]...` command. Replaces the
              #          deleted bash `bin/secrets-add` wrapper. Personal-vault
              #          Login ciphers only — org-cipher creation deferred.
              #          Prompts for the secret value via the zenity > kdialog >
              #          SSH_ASKPASS > tty chain, refuses if the name already
              #          exists, re-syncs after success. 12 new tests;
              #          63/63 total pass.
              # f9f990d (Phase 2d login UX: added [1/4]-[4/4] progress indicators
              #          before each interactive prompt (server, email, master
              #          password, TOTP) so users know which step they're on.
              #          Clearer prompt labels ("Bitwarden account email:",
              #          "Master password: ", "Two-factor code (<provider>)").
              #          Added passwordPromptInteractive that checks libsecret
              #          first via readLibsecretPassword() — uses stored password
              #          silently when present (with "(using stored master password
              #          from libsecret)" feedback), otherwise falls through to
              #          the GUI / SSH_ASKPASS / terminal priority chain. Fixed
              #          %s format error in twoFactorPrompt. 51/51 tests pass).
              # 035ea4f (Phase 2 interactive login: login() dispatcher splits into
              #          client_credentials (both env vars set), clear error
              #          (exactly one set), or interactive (neither). Interactive
              #          flow prompts for server (cloud/self-hosted with config
              #          override), email (if not configured), master password
              #          via zenity > kdialog > SSH_ASKPASS > terminal priority
              #          chain (matches the now-removed devbox-global/bin/secrets-setup
              #          prompt pattern, kept for the historical priority order),
              #          and 2FA if enabled. Non-TTY environments get a clear
              #          error (overridable with FORCE_STDIN_PROMPTS=true).
              #          Captcha on password grant returns a clear error pointing
              #          to API key login (no recursive retry). 12 new tests.
              #          Best-effort libsecret storage of the master password).
              # 7a0f56d (Phase 1 bitw cache: devbox-global's bin/secrets-refresh
              #          shells out to bitw get 8x (one process per vault item,
              #          each redoing Argon2id). Errors were masked by 2>/dev/null
              #          and "bitw get failed", hiding MAC mismatch + KDF state.
              #          bitw cache reads a manifest (~/.config/bitw/cache.ini),
              #          decrypts all ciphers in one process, writes the cache
              #          atomically. Errors surface with full context: cipher
              #          name, field, error type, KDF state, email source. 8 tests
              #          including TestCache_ErrorNotMasked regression guard.
              #          No new dependencies).
              # 061eeb7 (Phase 3d JWT email fallback: secrets.email() now has a 4th
              #          fallback tier that extracts the email claim from the JWT
              #          access token. Lets client_credentials users decrypt without
              #          configuring $EMAIL, a config file entry, or waiting for
              #          /sync. Stdlib base64+json only, no new deps. 8 new subtests
              #          in TestEmailFromAccessToken).
              # 9bb2335 (Phase 3c KDF refresh on sync: client_credentials logins skip
              #          prelogin (auth.go:116), so data.json's KDF block never
              #          refreshed. After a vault re-key, initKeys derived the wrong
              #          symmetric key and decrypt failed with "MAC mismatch"
              #          (crypto.go:308). sync() now calls refreshKDF after /sync GET
              #          so KDF stays in lockstep with the cipher blob. Non-fatal
              #          when KDF cached; fatal when unset. 3 regression tests).
              # 8c4d06c (Phase 3b Auth-Email removal: the live Bitwarden identity
              #          server maps an invalid Auth-Email header to
              #          invalid_username_or_password, silently rejecting password
              #          grant login. Dropped the header + base64 import + the
              #          associated comment from api.go; password grant now
              #          correctly reaches the twoFactorPrompt path).
              # f65dd2d (Phase 3a email-skip: drop the $EMAIL requirement for
              #          client_credentials users by moving the email check
              #          + /accounts/prelogin fetch inside the !useApiKey
              #          branch of login(); fallback path lazy-fetches if
              #          password grant is needed after a client_credentials
              #          failure).
              # 0cb7762 (ensureToken fast-path: skip re-auth when cached access token
              #          is valid; fixes 'Cannot reach Bitwarden vault' for
              #          client_credentials users calling `bitw sync` from a subshell
              #          that lacks BW_CLIENTID/BW_CLIENTSECRET env vars).
              rev = "b82e2b4";
              hash = "sha256-XvjJO+zHTYLXmunmeoJegCPwVca/HRD7OTeuiaoGQFg=";
            };

            # bitw has no vendor/ dir, so vendorHash is required (not null).
            vendorHash = "sha256-slM1IjkkXsv1rQx6D1Ofr2DkdgoimtZrhWi378UkgoI=";

            # buildGoModule's default checkPhase runs `go vet ./...` and `go test ./...`.
            # The tests require network access (connect to identity.bitwarden.com), which
            # is unavailable in the Nix sandbox. Override to only run vet.
            checkPhase = ''
              runHook preCheck
              go vet ./...
              runHook postCheck
            '';

            # Every dep is pure Go (godbus, x/crypto, uuid, ini, term, 2fa) — no cgo.
            # buildGoModule defaults CGO_ENABLED=1, but bitw has no cgo imports, so
            # the default is harmless. (Explicit CGO_ENABLED=0 conflicts with
            # buildGoModule's built-in env override.)

            # If the build fails with "go.mod requires go >= 1.26", add:
            #   go = pkgs.go_1_26;
            # (buildGoModule otherwise uses nixpkgs-unstable's default `go`.)
            # Confirmed via `nix eval --raw nixpkgs#go.version` -> 1.26.4 — no override needed.

            meta = {
              description = "Bitwarden D-Bus Secret Service provider (rbelem fork)";
              longDescription = ''
                bitw exposes a Bitwarden vault over the freedesktop.org Secret
                Service D-Bus API. This fork (rbelem/bitw) adds the mandatory
                Bitwarden-Client-Name/Version headers, moves the prelogin
                endpoint to the identity server, and unlocks the vault from a
                libsecret cache (secret-tool lookup bitwarden master-password)
                before falling back to an interactive prompt.
              '';
              homepage = "https://github.com/rbelem/bitw";
              license = nixpkgs.lib.licenses.bsd3;
              platforms = systems;
              mainProgram = "bitw";
              maintainers = [ ];
            };
          };

          default = bitw;
        }
      );
    };
}