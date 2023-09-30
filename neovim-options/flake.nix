{
  description = "Flake for neovim + extra options.";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
        neovim-full = pkgs.neovim.override {
          viAlias = true;
          vimAlias = true;
          vimdiffAlias = true;
          withNodeJs = true;
          withPython3 = true;
          withRuby = true;
        };
      in
      {
        packages = {
          inherit neovim-full;
          default = neovim-full;
        };
      }
    );
}
