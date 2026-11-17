{
  description = "agent-desktop - Computer use CLI for AI agents (NixOS-compatible)";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs =
    { self, nixpkgs }:
    let
      supportedSystems = [
        "x86_64-linux"
        "aarch64-linux"
      ];
      forAllSystems =
        f: nixpkgs.lib.genAttrs supportedSystems (system: f nixpkgs.legacyPackages.${system});

      version = "1.3.1";

      # Map nix system to agent-desktop release asset name
      systemToTarget = {
        "x86_64-linux" = "x86_64-unknown-linux-gnu";
        "aarch64-linux" = "aarch64-unknown-linux-gnu";
      };

      systemToHash = {
        "x86_64-linux" = "sha256-yne2t1A07rEuU33YwKTyo0JBGSU/OLfmvXm6DS/vEmQ=";
        "aarch64-linux" = "sha256-Q4mQpwP76xl3VZbDQcNwFDXoCtv6Gy9kuC/xdWfVVzs=";
      };
    in
    {
      packages = forAllSystems (pkgs: rec {
        agent-desktop = pkgs.stdenv.mkDerivation rec {
          pname = "agent-desktop";
          inherit version;

          src = pkgs.fetchurl {
            url = "https://github.com/vercel-labs/agent-desktop/releases/download/v${version}/agent-desktop-v${version}-${
              systemToTarget.${pkgs.stdenv.hostPlatform.system}
            }.tar.gz";
            hash = systemToHash.${pkgs.stdenv.hostPlatform.system};
          };

          # Tarball holds `agent-desktop` plus the `agent-desktop-linux-clipboard-owner`
          # helper, which must stay beside the executable.
          dontUnpack = true;

          nativeBuildInputs = [
            pkgs.gnutar
            pkgs.autoPatchelfHook
          ];
          buildInputs = [ pkgs.libgcc ];

          installPhase = ''
            runHook preInstall
            mkdir -p $out/bin
            tar xzf $src
            install -m755 agent-desktop $out/bin/agent-desktop
            install -m755 agent-desktop-linux-clipboard-owner $out/bin/agent-desktop-linux-clipboard-owner
            runHook postInstall
          '';

          dontStrip = true;

          meta = with pkgs.lib; {
            description = "Computer use CLI for AI agents (AT-SPI accessibility tree, no screenshots)";
            homepage = "https://github.com/vercel-labs/agent-desktop";
            license = licenses.asl20;
            mainProgram = "agent-desktop";
            platforms = supportedSystems;
          };
        };

        default = agent-desktop;
      });

      apps = forAllSystems (pkgs: {
        agent-desktop = {
          type = "app";
          program = "${self.packages.${pkgs.system}.agent-desktop}/bin/agent-desktop";
        };
        default = self.apps.${pkgs.system}.agent-desktop;
      });
    };
}
