{
  description = "fx - terminal JSON viewer and processor";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { self, nixpkgs }: let
    supportedSystems = [ "x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin" ];
    forAllSystems = f: nixpkgs.lib.genAttrs supportedSystems (system: f nixpkgs.legacyPackages.${system});

    version = "0.0.3";

    systemToTarget = {
      "x86_64-linux"   = "linux-x86_64";
      "aarch64-linux"  = "linux-aarch64";
      "x86_64-darwin"  = "macos-x86_64";
      "aarch64-darwin" = "macos-aarch64";
    };

    systemToHash = {
      "x86_64-linux"   = "sha256-I9MuYCM7JFgbnOGWW2W6tqRtVpOiSt14F4VK7zrfW/s=";
      "aarch64-linux"  = "sha256-hn6y1mlpOuC140U6VxIwujtnRlYm1WbLyoOuhDKx4Do=";
      "x86_64-darwin"  = "sha256-pLtTRtp2sDe/8oVJpzqSqnWQLXN68mrhZvJ/aecX1FM=";
      "aarch64-darwin" = "sha256-h8STliGwwCjkUG8YQWuHIt7Q26zmNYOAARQAyO0Seos=";
    };
  in {
    packages = forAllSystems (pkgs: rec {
      fx = pkgs.stdenv.mkDerivation rec {
        pname = "fx";
        inherit version;

        src = pkgs.fetchurl {
          url = "https://github.com/vercel-labs/fx/releases/download/v${version}/fx-${systemToTarget.${pkgs.stdenv.hostPlatform.system}}.tar.gz";
          hash = systemToHash.${pkgs.stdenv.hostPlatform.system};
        };

        dontUnpack = true;

        installPhase = ''
          runHook preInstall
          mkdir -p $out/bin
          tar xzf $src
          install -m755 fx $out/bin/fx
          runHook postInstall
        '';

        meta = with pkgs.lib; {
          description = "Terminal JSON viewer and processor";
          homepage = "https://github.com/vercel-labs/fx";
          license = licenses.asl20;
          mainProgram = "fx";
          platforms = supportedSystems;
        };
      };

      default = fx;
    });
  };
}
