{
  description = "Flake for nerdfonts.";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
  flake-utils.lib.eachDefaultSystem (system:
    let
      overlay = final: prev: {
        codeium = prev.codeium.overrideAttrs (old: {
          src = prev.fetchurl {
            name = "codeium-1.2.99.gz";
            url = "https://github.com/Exafunction/codeium/releases/download/language-server-v1.2.99/language_server_x64.gz";
            hash = final.lib.fakeHash;
          };
        });
      };

      pkgs =
        import nixpkgs {
          inherit system;
          overlays = [ overlay ];
        };

    in rec {
      packages = {
        inherit pkgs;
        default = pkgs.codeium;
      };
    }
  );
}
