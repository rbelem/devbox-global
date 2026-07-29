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
              # 0cb7762 (ensureToken fast-path: skip re-auth when cached access token
              #          is valid; fixes 'Cannot reach Bitwarden vault' for
              #          client_credentials users calling `bitw sync` from a subshell
              #          that lacks BW_CLIENTID/BW_CLIENTSECRET env vars).
              rev = "0cb7762fbeab0fd252eade329571444fa49544b0";
              hash = "sha256-yDqM29IK0LHBXWDNk2xzuM6Tce+WQ8Z6ZP5nTXAogPA=";
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