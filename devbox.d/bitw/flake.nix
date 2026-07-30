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
              rev = "061eeb7989f8ca72dee7c8489942d5be2f7ff733";
              hash = "sha256-vPSPoDxubDA2Qh1E5C4jISeq9nDKWZ+sGMusaaMdXoY=";
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