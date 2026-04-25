{
  description = "OpenCode built from source (overlay on official nixpkgs)";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    let
      version = "0.0.0-dev";
      rev = "f7d527cd28affbd68c18e11c36799d252d88df13";
      srcHash = "sha256-3yLbRk2fYuGF3zwtSN/S4Yr3ceukqXxmMEMN1A+a8uM=";
      # Get the real hash:
      #   cd ~/.local/share/devbox/global/current/devbox.d/opencode
      #   nix build .#opencode-git 2>&1 | grep "got:"
      # Then paste the sha256-... value below
      nodeModulesHash = "sha256-r0UCWhxIB4q4Te+LpXNcfexjfmI4Th2swfWOL3cUp3g=";

      overlay = final: prev:
        let
          src = prev.fetchFromGitHub {
            owner = "anomalyco";
            repo = "opencode";
            inherit rev;
            hash = srcHash;
          };
        in {
          opencode-git = prev.opencode.overrideAttrs (old: {
            inherit version src;

            node_modules = old.node_modules.overrideAttrs (oldNode: {
              inherit src version;
              pname = "opencode-git-node_modules";
              outputHash = nodeModulesHash;
              outputHashAlgo = "sha256";
              outputHashMode = "recursive";
            });
          });
        };
    in {
      overlays.default = overlay;
    } // flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs {
          inherit system;
          overlays = [ overlay ];
        };
      in {
        packages = {
          default = pkgs.opencode-git;
          opencode = pkgs.opencode-git;
          opencode-git = pkgs.opencode-git;
        };

        apps = {
          default = {
            type = "app";
            program = "${pkgs.opencode-git}/bin/opencode";
          };
          opencode = {
            type = "app";
            program = "${pkgs.opencode-git}/bin/opencode";
          };
        };
      }
    );
}
