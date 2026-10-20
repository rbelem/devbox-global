{
  description = "bsk - BrowserSkill CLI: lets AI agents drive your already logged-in browser via a local daemon + extension bridge";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { self, nixpkgs }: let
    supportedSystems = [ "x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin" ];
    forAllSystems = f: nixpkgs.lib.genAttrs supportedSystems (system: f nixpkgs.legacyPackages.${system});

    version = "0.3.3";

    # Rust target-triple naming; musl preferred on Linux (static-pie, no patchelf).
    systemToTarget = {
      "x86_64-linux"   = "x86_64-unknown-linux-musl";
      "aarch64-linux"  = "aarch64-unknown-linux-musl";
      "x86_64-darwin"  = "x86_64-apple-darwin";
      "aarch64-darwin" = "aarch64-apple-darwin";
    };

    # From GitHub release API assets[].digest (cli-v0.3.3).
    systemToHash = {
      "x86_64-linux"   = "sha256-FBtzSJvsmddozxgEKRnw4FTJ9hTm7N/XVAKNK2BukQY=";
      "aarch64-linux"  = "sha256-dH5MQW2kZlDH2BJ6R92PCOgT4PaTZsTbGvIm0LY6V10=";
      "x86_64-darwin"  = "sha256-paMcWGtyAwmwJVEo2G7+pxYboi+nh2vPUFVNMTA7q+E=";
      "aarch64-darwin" = "sha256-5rt8rwU2fclhQf1ds6cOmCWgOoDTwuip2Awh0IYaZ/M=";
    };
  in {
    packages = forAllSystems (pkgs: rec {
      bsk = pkgs.stdenv.mkDerivation rec {
        pname = "bsk";
        inherit version;

        src = pkgs.fetchurl {
          url = "https://github.com/Tencent/BrowserSkill/releases/download/cli-v${version}/bsk-v${version}-${systemToTarget.${pkgs.stdenv.hostPlatform.system}}.tar.gz";
          hash = systemToHash.${pkgs.stdenv.hostPlatform.system};
        };

        dontUnpack = true;

        installPhase = ''
          runHook preInstall
          mkdir -p $out/bin
          tar xzf $src
          install -m755 bsk $out/bin/bsk
          runHook postInstall
        '';

        meta = with pkgs.lib; {
          description = "BrowserSkill CLI: browser automation bridge between AI agents and your logged-in browser";
          homepage = "https://github.com/Tencent/BrowserSkill";
          license = licenses.mit;
          mainProgram = "bsk";
          platforms = supportedSystems;
        };
      };

      default = bsk;
    });
  };
}
