{
  description = "oh-my-pi - coding agent with the IDE wired in (omp, prebuilt bun compile)";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { self, nixpkgs }: let
    supportedSystems = [ "x86_64-linux" "aarch64-linux" ];
    forAllSystems = f: nixpkgs.lib.genAttrs supportedSystems (system: f nixpkgs.legacyPackages.${system});

    version = "17.2.15";

    # Prebuilt bare executables (bun build --compile; linux-x64 uses the
    # bun-linux-x64-baseline target, no AVX — VirtualBox compatible).
    # Hashes from the release SHA256SUMS.txt, converted to SRI.
    systemToAsset = {
      "x86_64-linux"  = "omp-linux-x64";
      "aarch64-linux" = "omp-linux-arm64";
    };

    systemToHash = {
      "x86_64-linux"  = "sha256-+ohJQfky9PXSBGrLqXF5Cuaq4Y/UgGRysB8EHeZwNoo=";
      "aarch64-linux" = "sha256-NlB7o9mDMvUmSdIgCerYbxVKsAfLFp1oaQ+isBEXaa0=";
    };
  in {
    packages = forAllSystems (pkgs: rec {
      oh-my-pi = pkgs.stdenv.mkDerivation {
        pname = "omp";
        inherit version;

        src = pkgs.fetchurl {
          url = "https://github.com/can1357/oh-my-pi/releases/download/v${version}/${systemToAsset.${pkgs.stdenv.hostPlatform.system}}";
          hash = systemToHash.${pkgs.stdenv.hostPlatform.system};
        };

        dontUnpack = true;

        nativeBuildInputs = [ pkgs.autoPatchelfHook ];

        installPhase = ''
          runHook preInstall
          mkdir -p $out/bin
          install -m755 $src $out/bin/omp
          runHook postInstall
        '';

        meta = with pkgs.lib; {
          description = "Coding agent with the IDE wired in";
          homepage = "https://github.com/can1357/oh-my-pi";
          license = licenses.mit;
          mainProgram = "omp";
          platforms = supportedSystems;
        };
      };

      default = oh-my-pi;
    });

    apps = forAllSystems (pkgs: {
      omp = {
        type = "app";
        program = "${self.packages.${pkgs.system}.oh-my-pi}/bin/omp";
      };
      default = self.apps.${pkgs.system}.omp;
    });
  };
}