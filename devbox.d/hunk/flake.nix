{
  description = "hunk - Review-first terminal diff viewer for agent-authored changesets";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { self, nixpkgs }: let
    supportedSystems = [ "x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin" ];
    forAllSystems = f: nixpkgs.lib.genAttrs supportedSystems (system: f nixpkgs.legacyPackages.${system});

    version = "0.17.6";

    systemToTarget = {
      "x86_64-linux"  = "linux-x64";
      "aarch64-linux" = "linux-arm64";
      "x86_64-darwin" = "darwin-x64";
      "aarch64-darwin" = "darwin-arm64";
    };

    systemToHash = {
      "x86_64-linux"  = "sha256-/TcD0a+1HROoD7SYGMNJutzFdCw+EA7UYYT3MYwm7mo=";
      "aarch64-linux" = "sha256-Et+gyvdAAEVRtmI+3yI+cPUi0LaJJoLm2/owK9mset4=";
      "x86_64-darwin" = "sha256-oqxYpJuE9ewXLXGzA/oPDmq2PC7xjHQqBGRXc2U2gJU=";
      "aarch64-darwin" = "sha256-BcAMig+SpkM0o2Wek7+T5yBIUuIfi0On4zjqb8ehN8E=";
    };
  in {
    packages = forAllSystems (pkgs: rec {
      hunk = pkgs.stdenv.mkDerivation rec {
        pname = "hunk";
        inherit version;

        src = pkgs.fetchurl {
          url = "https://github.com/modem-dev/hunk/releases/download/v${version}/hunkdiff-${systemToTarget.${pkgs.stdenv.hostPlatform.system}}.tar.gz";
          hash = systemToHash.${pkgs.stdenv.hostPlatform.system};
        };

        # Bun-compiled binaries have embedded data that strip/patchelf corrupts.
        dontUnpack = true;
        dontStrip = true;
        dontPatchELF = true;

        nativeBuildInputs = [ pkgs.gnutar ];

        installPhase = ''
          runHook preInstall
          mkdir -p $out/bin
          tar xzf $src
          install -m755 hunkdiff-*/hunk $out/bin/hunk
          runHook postInstall
        '';

        meta = with pkgs.lib; {
          description = "Review-first terminal diff viewer for agent-authored changesets";
          homepage = "https://github.com/modem-dev/hunk";
          license = licenses.agpl3Plus;
          mainProgram = "hunk";
          platforms = supportedSystems;
        };
      };

      default = hunk;
    });

    apps = forAllSystems (pkgs: {
      hunk = {
        type = "app";
        program = "${self.packages.${pkgs.system}.hunk}/bin/hunk";
      };
      default = self.apps.${pkgs.system}.hunk;
    });
  };
}
