{
  description = "Flake for neovim + extra options.";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
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
