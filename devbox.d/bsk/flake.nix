{
  description = "bsk - BrowserSkill CLI: lets AI agents drive your already logged-in browser via a local daemon + extension bridge";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs =
    { self, nixpkgs }:
    let
      supportedSystems = [
        "x86_64-linux"
        "aarch64-linux"
        "x86_64-darwin"
        "aarch64-darwin"
      ];
      forAllSystems =
        f: nixpkgs.lib.genAttrs supportedSystems (system: f nixpkgs.legacyPackages.${system});

      version = "0.4.0";

      # Rust target-triple naming; musl preferred on Linux (static-pie, no patchelf).
      systemToTarget = {
        "x86_64-linux" = "x86_64-unknown-linux-musl";
        "aarch64-linux" = "aarch64-unknown-linux-musl";
        "x86_64-darwin" = "x86_64-apple-darwin";
        "aarch64-darwin" = "aarch64-apple-darwin";
      };

      # From GitHub release API assets[].digest (cli-v0.3.3).
      systemToHash = {
        "x86_64-linux" = "sha256-2KN+xJUF6LusFc8zNcgy0Sx3EY3idvgWTcrZMjyvq8U=";
        "aarch64-linux" = "sha256-3O5G75OVntllZomAPmwBNIjTjBdLogH2dMpXTh8e2Z0=";
        "x86_64-darwin" = "sha256-EPy43X/qlvRxoR40ksTR14Rt5jDTZoE2v8XFlpCvqV4=";
        "aarch64-darwin" = "sha256-y+bm4pweIVw+RFR3xIVaA/Q8Y5c8pXgzfEKB5u6imq8=";
      };
    in
    {
      packages = forAllSystems (pkgs: rec {
        bsk = pkgs.stdenv.mkDerivation rec {
          pname = "bsk";
          inherit version;

          src = pkgs.fetchurl {
            url = "https://github.com/Tencent/BrowserSkill/releases/download/cli-v${version}/bsk-v${version}-${
              systemToTarget.${pkgs.stdenv.hostPlatform.system}
            }.tar.gz";
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
