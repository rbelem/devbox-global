{
  description = "A flake that outputs customized packages.";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
        git-options= pkgs.git.override {
          withLibsecret = true;
        };
      in
      {
        packages = {
          inherit git-options;
          default = git-options;
        };
      }
    );
}
