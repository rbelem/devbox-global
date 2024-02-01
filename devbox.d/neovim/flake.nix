{
  description = "Flake for neovim + extra options.";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    neovim-nightly-overlay.url = "github:nix-community/neovim-nightly-overlay";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, neovim-nightly-overlay, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        overlay = final: prev: {
          neovim-full = prev.neovim.override {
            extraLuaPackages = ps: [ ps.lpeg ];
            viAlias = true;
            vimAlias = true;
            withNodeJs = true;
            withPython3 = true;
            withRuby = true;
          };
        };

        pkgs =
          import nixpkgs {
            inherit system;
            overlays = [
              neovim-nightly-overlay.overlay
              overlay
            ];
          };

      in rec {
        packages = {
          inherit pkgs;
          default = pkgs.neovim-full;
        };
      }
    );
}
