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
            # implicit baseline; the Bitwarden-Client-Version header sent to
            # BW servers (api.go) matches this.
            version = "0.1.0";

            src = pkgs.fetchFromGitHub {
              owner = "rbelem";
              repo = "bitw";
              # Bump together with the upstream commit SHA on rbelem/bitw master.
              rev = "821fb6f551d13f34844a0f2d176cf5bec7be0d6e";
              hash = "sha256-97K63MN7HOOOaiQF5XOr69rSaarS4i7HD0rBD/DMwwc=";
            };

            # bitw has no vendor/ dir, so vendorHash is required (not null).
            vendorHash = "sha256-L6kHDZt0+QMC9BCBgh0CMyfD1lCb8ymq1sl4QqoCGH0=";

            # buildGoModule's default checkPhase runs `go vet ./...`, which transitively
            # type-checks test packages. bitw's transitive test dep `rogpeppe/go-internal`
            # is pinned at v1.9.0 (2023), predating Go 1.21's `testing.testDeps.InitRuntimeCoverage`
            # method — its `nopTestDeps{}` doesn't satisfy the interface, breaking vet.
            # `dontCheck = true` doesn't override buildGoModule's explicit checkPhase
            # definition, so we replace it with a no-op.
            # TODO: bump rogpeppe/go-internal in the fork to v1.10+ to re-enable `go vet`.
            checkPhase = ''
              runHook preCheck
              echo "Skipping go vet: rogpeppe/go-internal v1.9.0 incompatible with Go 1.21+ testing API"
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