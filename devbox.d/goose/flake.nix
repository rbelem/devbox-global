{
  description = "goose - open source, extensible AI agent";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { self, nixpkgs }: let
    supportedSystems = [
      "x86_64-linux"
      "aarch64-linux"
      "x86_64-darwin"
      "aarch64-darwin"
    ];
    forAllSystems = f: nixpkgs.lib.genAttrs supportedSystems
      (system: f nixpkgs.legacyPackages.${system});

    version = "1.44.0";

    systemToTarget = {
      "x86_64-linux"   = "x86_64-unknown-linux-musl";
      "aarch64-linux"  = "aarch64-unknown-linux-musl";
      "x86_64-darwin"  = "x86_64-apple-darwin";
      "aarch64-darwin" = "aarch64-apple-darwin";
    };

    systemToHash = {
      "x86_64-linux"   = "sha256-21IvncNMYFH0tLhPZLdM1hEwjKRhRm6SiwfWnQC2rUo=";
      "aarch64-linux"  = "sha256-JSwhPiNEJLrxZ/c3N9LL9+OjmkxUQlqvuLwvrj4dEdg=";
      "x86_64-darwin"  = "sha256-Ok+Ju8FESMpMuPKLe0Hn6JHBMKVG1u5qzYyy/3fLO00=";
      "aarch64-darwin" = "sha256-+hcpPUh3is5gvzzc+7L8vXRighaiLMRbAgvRykW0IXA=";
    };
  in {
    packages = forAllSystems (pkgs: rec {
      goose = pkgs.stdenv.mkDerivation rec {
        pname = "goose";
        inherit version;

        src = pkgs.fetchurl {
          url = "https://github.com/aaif-goose/goose/releases/download/v${version}/goose-${systemToTarget.${pkgs.stdenv.hostPlatform.system}}.tar.gz";
          hash = systemToHash.${pkgs.stdenv.hostPlatform.system};
        };

        dontUnpack = true;

        installPhase = ''
          runHook preInstall
          mkdir -p $out/bin
          tar xzf $src
          install -m755 goose $out/bin/goose
          runHook postInstall
        '';

        meta = with pkgs.lib; {
          description = "Open source, extensible AI agent";
          homepage = "https://github.com/aaif-goose/goose";
          license = licenses.asl20;
          mainProgram = "goose";
          platforms = supportedSystems;
        };
      };

      default = goose;
    });

    apps = forAllSystems (pkgs: {
      goose = {
        type = "app";
        program = "${self.packages.${pkgs.system}.goose}/bin/goose";
      };
      default = self.apps.${pkgs.system}.goose;
    });
  };
}
