{
  description = "Flake for git + libsecret.";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
        git-libsecret = pkgs.git.override {
          withLibsecret = true;
        };
      in
      {
        packages = {
          inherit git-libsecret;
          default = git-libsecret;
        };
      }
    );
}
