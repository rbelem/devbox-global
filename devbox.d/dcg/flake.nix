{
  description = "dcg - Destructive Command Guard: blocks dangerous git/shell commands from being executed by AI coding agents";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { self, nixpkgs }: let
    supportedSystems = [ "x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin" ];
    forAllSystems = f: nixpkgs.lib.genAttrs supportedSystems (system: f nixpkgs.legacyPackages.${system});

    version = "0.6.7";

    # Upstream ships Rust target-triple-named .tar.xz assets.
    # Note: x86_64-linux uses musl (statically linked), aarch64-linux uses gnu.
    systemToTarget = {
      "x86_64-linux"   = "x86_64-unknown-linux-musl";
      "aarch64-linux"  = "aarch64-unknown-linux-gnu";
      "x86_64-darwin"  = "x86_64-apple-darwin";
      "aarch64-darwin" = "aarch64-apple-darwin";
    };

    systemToHash = {
      "x86_64-linux"   = "sha256-bZB1S3FwvetjN1/X0g59wzDFa48QGPxFzLvVzMwcoYM=";
      "aarch64-linux"  = "sha256-nZ7bVBoDwEl+RHLlymF0fUdjV87Qd9tFK7SBHO5ct34=";
      "x86_64-darwin"  = "sha256-SBg1nljSGHIWDtVpiE7WQZNdX3Qii60wzR+qTUPBFYQ=";
      "aarch64-darwin" = "sha256-3M/ZDb13p1RkeErpC+EOQ1bPAYVnCMqFBuy1bafnXn8=";
    };
  in {
    packages = forAllSystems (pkgs: rec {
      dcg = pkgs.stdenv.mkDerivation rec {
        pname = "dcg";
        inherit version;

        src = pkgs.fetchurl {
          url = "https://github.com/Dicklesworthstone/destructive_command_guard/releases/download/v${version}/dcg-${systemToTarget.${pkgs.stdenv.hostPlatform.system}}.tar.xz";
          hash = systemToHash.${pkgs.stdenv.hostPlatform.system};
        };

        dontUnpack = true;

        nativeBuildInputs = [ pkgs.gnutar pkgs.xz ];

        installPhase = ''
          runHook preInstall
          mkdir -p $out/bin
          tar -xJf $src
          install -m755 dcg $out/bin/dcg
          runHook postInstall
        '';

        meta = with pkgs.lib; {
          description = "Destructive Command Guard: blocks dangerous git/shell commands from AI coding agents";
          homepage = "https://github.com/Dicklesworthstone/destructive_command_guard";
          # Upstream license is "MIT with OpenAI/Anthropic Rider" — a non-standard
          # restriction on top of MIT. Tagged as MIT here; the rider is enforced
          # upstream rather than by nixpkgs.
          license = licenses.mit;
          mainProgram = "dcg";
          platforms = supportedSystems;
        };
      };

      default = dcg;
    });

    apps = forAllSystems (pkgs: {
      dcg = {
        type = "app";
        program = "${self.packages.${pkgs.system}.dcg}/bin/dcg";
      };
      default = self.apps.${pkgs.system}.dcg;
    });
  };
}
