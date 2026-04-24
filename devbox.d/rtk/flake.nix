{
  description = "rtk - AI-powered CLI for shell command discovery and execution";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { self, nixpkgs }: let
    supportedSystems = [ "x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin" ];
    forAllSystems = f: nixpkgs.lib.genAttrs supportedSystems (system: f nixpkgs.legacyPackages.${system});

    # Map nix system to rtk release target
    systemToTarget = {
      "x86_64-linux" = "x86_64-unknown-linux-musl";
      "aarch64-linux" = "aarch64-unknown-linux-gnu";
      "x86_64-darwin" = "x86_64-apple-darwin";
      "aarch64-darwin" = "aarch64-apple-darwin";
    };

    version = "0.37.2";

  in {
    packages = forAllSystems (pkgs: rec {
      rtk = pkgs.stdenv.mkDerivation rec {
        pname = "rtk";
        inherit version;

        src = pkgs.fetchurl {
          url = "https://github.com/rtk-ai/rtk/releases/download/v${version}/rtk-${systemToTarget.${pkgs.system}}.tar.gz";
          sha256 = {
            "x86_64-linux"   = "sha256-Pft6BWNqaGh7ocWqaW+o1fy0lER97YbZ64uItxAKN8Y=";
            "aarch64-linux"  = "sha256-HY1/zKbLBuGGfAi7Tlql8QfAN8YHExPlEbcmrjOsNUc=";
            "x86_64-darwin"  = "sha256-QFLndAqH4SH2caLemJvz8BXcWLYX1rC7MA2nWZy0TZQ=";
            "aarch64-darwin" = "sha256-meIKWYR97btkAyqD95hfL5Wfy5Z02Or5QPxYooh+Juo=";
          }.${pkgs.system};
        };

        sourceRoot = ".";

        nativeBuildInputs = [ pkgs.gnutar pkgs.gzip ];

        unpackPhase = ''
          tar -xzf $src
        '';

        installPhase = ''
          mkdir -p $out/bin
          install -m755 rtk $out/bin/rtk
        '';

        dontStrip = true;

        meta = with pkgs.lib; {
          description = "AI-powered CLI for shell command discovery and execution";
          homepage = "https://github.com/rtk-ai/rtk";
          license = licenses.mit;
          mainProgram = "rtk";
          platforms = supportedSystems;
        };
      };

      default = rtk;
    });

    apps = forAllSystems (pkgs: {
      rtk = {
        type = "app";
        program = "${self.packages.${pkgs.system}.rtk}/bin/rtk";
      };
      default = self.apps.${pkgs.system}.rtk;
    });
  };
}
