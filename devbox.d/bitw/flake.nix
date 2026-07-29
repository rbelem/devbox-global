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
              # e39fdf0 (Phase 2: request-profile alignment with upstream bitwarden/clients;
              #                clientVersion constant; deviceType() derives from deviceTypeNum();
              #                Bitwarden-Client-Version 0.1.0 → 2026.7.0;
              #                Accept/User-Agent(bitwarden_CLI/<ver> (LINUX))/Device-Type:25 added
              #                centrally in httpDo).
              rev = "e39fdf0065d94a12525afb417df8f766f7dcf50c";
              hash = "sha256-vr+a+z5Xf3vKyBMeHINi8cjIEJt8jC1d+4Aus5VIXrs=";
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