{
  description = "iii-engine - Runtime for agentmemory and iii-based apps";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { self, nixpkgs }: let
    supportedSystems = [ "x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin" ];
    forAllSystems = f: nixpkgs.lib.genAttrs supportedSystems (system: f nixpkgs.legacyPackages.${system});

    systemToAsset = {
      "x86_64-linux"    = "x86_64-unknown-linux-gnu";
      "aarch64-linux"   = "aarch64-unknown-linux-gnu";
      "x86_64-darwin"   = "x86_64-apple-darwin";
      "aarch64-darwin"  = "aarch64-apple-darwin";
    };

    version = "0.11.2";
  in {
    packages = forAllSystems (pkgs: rec {
      iii-engine = pkgs.stdenvNoCC.mkDerivation rec {
        pname = "iii-engine";
        inherit version;

        src = pkgs.fetchurl {
          url = "https://github.com/iii-hq/iii/releases/download/iii/v${version}/iii-${systemToAsset.${pkgs.stdenv.hostPlatform.system}}.tar.gz";
          hash = {
            "x86_64-linux"    = "sha256-nIPEd4i070vutl3ZvzfpT5k3cM09uHRGTDzhzckjUs0=";
            "aarch64-linux"   = "";
            "x86_64-darwin"   = "";
            "aarch64-darwin"  = "";
          }.${pkgs.stdenv.hostPlatform.system} or pkgs.lib.fakeHash;
        };

        dontUnpack = true;

        installPhase = ''
          runHook preInstall

          mkdir -p $out/bin
          tar -xzf $src -C $out/bin iii
          chmod +x $out/bin/iii

          runHook postInstall
        '';

        dontFixup = true;

        meta = with pkgs.lib; {
          description = "iii-engine runtime";
          longDescription = ''
            iii-engine is the runtime that powers agentmemory and other
            iii-based applications. It provides function triggers, state
            management, streams, and WebSocket-based coordination.
          '';
          homepage = "https://github.com/iii-hq/iii";
          license = licenses.asl20;
          mainProgram = "iii";
          platforms = supportedSystems;
        };
      };

      default = iii-engine;
    });
  };
}
