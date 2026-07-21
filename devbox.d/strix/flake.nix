{
  description = "strix - Open-source AI pentesting tool";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { self, nixpkgs }: let
    supportedSystems = [ "x86_64-linux" ];
    forAllSystems = f: nixpkgs.lib.genAttrs supportedSystems (system: f nixpkgs.legacyPackages.${system});

    version = "1.2.0";

    systemToTarget = {
      "x86_64-linux" = "strix-${version}-linux-x86_64";
    };

    systemToHash = {
      "x86_64-linux" = "sha256-ZGXNiM5s5XJKX2FaFkQUFiEP69O8bdQEIdTFjQj6hH4=";
    };
  in {
    packages = forAllSystems (pkgs: rec {
      strix = pkgs.stdenv.mkDerivation rec {
        pname = "strix";
        inherit version;

        src = pkgs.fetchurl {
          url = "https://github.com/usestrix/strix/releases/download/v${version}/${systemToTarget.${pkgs.stdenv.hostPlatform.system}}.tar.gz";
          hash = systemToHash.${pkgs.stdenv.hostPlatform.system};
        };

        dontUnpack = true;

        installPhase = ''
          runHook preInstall
          mkdir -p $out/bin
          tar xzf $src
          install -m755 strix-${version}-linux-x86_64 $out/bin/strix
          runHook postInstall
        '';

        meta = with pkgs.lib; {
          description = "Open-source AI pentesting tool";
          homepage = "https://github.com/usestrix/strix";
          license = licenses.asl20;
          mainProgram = "strix";
          platforms = supportedSystems;
        };
      };

      default = strix;
    });

    apps = forAllSystems (pkgs: {
      strix = {
        type = "app";
        program = "${self.packages.${pkgs.system}.strix}/bin/strix";
      };
      default = self.apps.${pkgs.system}.strix;
    });
  };
}
