# Herdr Core (hc) - the core that runs terminals for the Herdr desktop app.
# The binary ships prebuilt from releases.herdr.dev (the GitHub repo has no
# release assets), so update-flake cannot track it: the release manifest at
# https://releases.herdr.dev/core/latest.json carries the newest version and
# the sha256 of every target. Bump `version` and the hashes here by hand.
{
  description = "herdr-core - Herdr core: the terminal daemon for the Herdr desktop app";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs =
    { self, nixpkgs }:
    let
      supportedSystems = [
        "x86_64-linux"
        "aarch64-linux"
      ];
      forAllSystems = nixpkgs.lib.genAttrs supportedSystems;

      version = "0.1.19";

      systemToTarget = {
        "x86_64-linux" = "linux-x86_64";
        "aarch64-linux" = "linux-aarch64";
      };

      # Literal SRI hashes only. This map sits OUTSIDE pkgs scope, so
      # pkgs.lib.fakeHash does not evaluate and a bump can reset them.
      # Upstream publishes them as hex sha256 in the manifest:
      #   nix hash convert --hash-algo sha256 --to sri <hex>
      systemToHash = {
        "x86_64-linux" = "sha256-Stz7Qj1S8kxcxKHizS/K0fYtKLt3h2rEcsKQgqPqpCQ=";
        "aarch64-linux" = "sha256-+Vw0/XF37ViAfXT+TueLs9xz6zfyHGlJYGQACiGryxA=";
      };
    in
    {
      packages = forAllSystems (
        system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
        in
        rec {
          herdr-core = pkgs.stdenv.mkDerivation {
            pname = "herdr-core";
            inherit version;

            # upstream: herdrdev/herdr-core
            src = pkgs.fetchurl {
              url = "https://releases.herdr.dev/core/${version}/herdr-core-${systemToTarget.${system}}.tar.gz";
              hash = systemToHash.${system};
            };

            dontUnpack = true;
            # The binary ships prebuilt, static and stripped.
            dontStrip = true;

            installPhase = ''
              runHook preInstall

              tar -xzf "$src" -C "$TMPDIR"

              # Static-pie binary: no interpreter, no libraries to patch.
              install -D -m755 "$TMPDIR/herdr-core" $out/bin/herdr-core
              # Upstream's alias; a window manager shipping its own `hc`
              # can drop this link.
              ln -s herdr-core $out/bin/hc

              install -D -m644 "$TMPDIR/LICENSE" \
                $out/share/licenses/herdr-core/LICENSE
              install -D -m644 "$TMPDIR/THIRD-PARTY-NOTICES" \
                $out/share/licenses/herdr-core/THIRD-PARTY-NOTICES

              runHook postInstall
            '';

            meta = with pkgs.lib; {
              description = "Herdr core - the terminal daemon for the Herdr desktop app";
              homepage = "https://github.com/herdrdev/herdr-core";
              license = licenses.asl20;
              mainProgram = "herdr-core";
              platforms = supportedSystems;
            };
          };

          default = herdr-core;
        }
      );

      apps = forAllSystems (system: {
        herdr-core = {
          type = "app";
          program = "${self.packages.${system}.herdr-core}/bin/herdr-core";
        };
        default = self.apps.${system}.herdr-core;
      });
    };
}
