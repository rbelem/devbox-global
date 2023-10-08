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
        nerdfonts = prev.nerdfonts.override {
          fonts = [
            "Hack"
            "Noto"
            "FiraCode"
          ];
        };
      };

      #
      pkgs =
        import nixpkgs {
          inherit system;
          overlays = [ overlay ];
        };

    in rec {
      packages = {
        nerdfonts = pkgs.nerdfonts;
      };
    }
  );
}
