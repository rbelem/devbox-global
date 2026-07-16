{
  description = "herdr - Terminal workspace manager for AI coding agents";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { self, nixpkgs }: let
    supportedSystems = [ "x86_64-linux" "aarch64-linux" ];
    forAllSystems = f: nixpkgs.lib.genAttrs supportedSystems (system: f nixpkgs.legacyPackages.${system});

    version = "0.7.4";

    systemToTarget = {
      "x86_64-linux"  = "herdr-linux-x86_64";
      "aarch64-linux" = "herdr-linux-aarch64";
    };

    systemToHash = {
      "x86_64-linux"  = "sha256-vA/ALUulAPnKwjU6Q+Z/4DZ4Xsym61U3jgUPrDwQMFk=";
      "aarch64-linux" = "sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
    };
  in {
    packages = forAllSystems (pkgs: rec {
      herdr = pkgs.stdenv.mkDerivation rec {
        pname = "herdr";
        inherit version;

        src = pkgs.fetchurl {
          url = "https://github.com/ogulcancelik/herdr/releases/download/v${version}/${systemToTarget.${pkgs.stdenv.hostPlatform.system}}";
          hash = systemToHash.${pkgs.stdenv.hostPlatform.system};
        };

        dontUnpack = true;

        installPhase = ''
          runHook preInstall
          mkdir -p $out/bin
          install -m755 $src $out/bin/herdr
          runHook postInstall
        '';

        meta = with pkgs.lib; {
          description = "Terminal workspace manager for AI coding agents";
          homepage = "https://github.com/ogulcancelik/herdr";
          license = licenses.agpl3Plus;
          mainProgram = "herdr";
          platforms = supportedSystems;
        };
      };

      default = herdr;
    });

    apps = forAllSystems (pkgs: {
      herdr = {
        type = "app";
        program = "${self.packages.${pkgs.system}.herdr}/bin/herdr";
      };
      default = self.apps.${pkgs.system}.herdr;
    });
  };
}
