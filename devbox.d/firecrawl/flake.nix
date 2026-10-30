{
  description = "firecrawl - Firecrawl CLI";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs =
    { self, nixpkgs }:
    let
      supportedSystems = [
        "x86_64-linux"
        "aarch64-linux"
        "x86_64-darwin"
        "aarch64-darwin"
      ];
      forAllSystems =
        f: nixpkgs.lib.genAttrs supportedSystems (system: f nixpkgs.legacyPackages.${system});

      version = "1.26.24";

      # Node.js ecosystem naming: <os>-<arch>
      systemToTarget = {
        "x86_64-linux" = "linux-x64";
        "aarch64-linux" = "linux-arm64";
        "x86_64-darwin" = "darwin-x64";
        "aarch64-darwin" = "darwin-arm64";
      };

      # No SHA256SUMS published; hashes computed per-asset via sha256sum + nix hash to-sri.
      systemToHash = {
        "x86_64-linux" = "sha256-uR3OxfVpteTD+0DHm4ZraM08GgY+TwxkKk6bG2bTMPM=";
        "aarch64-linux" = "sha256-iRsRw2DZfTSApl2bqSDB8Chci7ccklo6BRah0OcX0Bs=";
        "x86_64-darwin" = "sha256-QXDXYL7jMruj+emO4WXx/2FmzR+7ZZl9zF+nHXWzrZ4=";
        "aarch64-darwin" = "sha256-Q1PRJOcR00j1rnVbRhmgLfydEfT8k2AsyiJRsR//lc4=";
      };
    in
    {
      packages = forAllSystems (pkgs: rec {
        firecrawl = pkgs.stdenv.mkDerivation rec {
          pname = "firecrawl";
          inherit version;

          src = pkgs.fetchurl {
            url = "https://github.com/firecrawl/cli/releases/download/v${version}/firecrawl-${
              systemToTarget.${pkgs.stdenv.hostPlatform.system}
            }.tar.gz";
            hash = systemToHash.${pkgs.stdenv.hostPlatform.system};
          };

          dontUnpack = true;

          # Bun-compiled binaries (`bun build --compile`) embed JS bytecode/data
          # inside the ELF. Nix's fixup phase runs `strip` + `patchelf`, which
          # mangles the embedded bun data and leaves the binary showing bun
          # runtime help instead of the app's CLI.
          dontStrip = true;
          dontPatchELF = true;

          installPhase = ''
            runHook preInstall
            mkdir -p $out/bin
            tar xzf $src
            install -m755 firecrawl-${systemToTarget.${pkgs.stdenv.hostPlatform.system}} $out/bin/firecrawl
            runHook postInstall
          '';

          meta = with pkgs.lib; {
            description = "Firecrawl CLI - turn websites into AI-ready datasets";
            homepage = "https://github.com/firecrawl/cli";
            license = licenses.isc;
            mainProgram = "firecrawl";
            platforms = supportedSystems;
          };
        };

        default = firecrawl;
      });

      apps = forAllSystems (pkgs: {
        firecrawl = {
          type = "app";
          program = "${self.packages.${pkgs.system}.firecrawl}/bin/firecrawl";
        };
        default = self.apps.${pkgs.system}.firecrawl;
      });
    };
}
