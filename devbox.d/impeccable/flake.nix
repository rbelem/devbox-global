{
  description = "impeccable - design guidance for AI coding agents";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { self, nixpkgs }:
    let
      systems = [ "x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin" ];
      forAllSystems = nixpkgs.lib.genAttrs systems;

      version = "3.1.0";

      # Bun baseline (no AVX — works on VirtualBox).
      bunVersion = "1.3.13";
      bunHash = "sha256-nYokKSpwaAkCBdqsCloiP19pc29Sh+N7+I07QDHtx1A=";

      # Overlay that replaces nixpkgs' bun with baseline build (no AVX/AVX2)
      # for VirtualBox compat. Same pattern as devbox.d/opencode.
      bun-baseline-overlay = final: prev: {
        bun = prev.bun.overrideAttrs (old: {
          src = prev.fetchurl {
            url = "https://github.com/oven-sh/bun/releases/download/bun-v${bunVersion}/bun-linux-x64-baseline.zip";
            hash = bunHash;
          };
        });
      };
    in
    {
      packages = forAllSystems (system:
        let
          pkgs = import nixpkgs {
            inherit system;
            overlays = [ bun-baseline-overlay ];
          };

          src = pkgs.fetchFromGitHub {
            owner = "pbakaus";
            repo = "impeccable";
            rev = "cli-v${version}";
            hash = "sha256-U6Eukc+xT4xX/jA3IVNB42p7Eey2XDbK6l5LHSTATX8=";
          };
        in
        {
          default = pkgs.stdenvNoCC.mkDerivation {
            pname = "impeccable";
            inherit version src;

            # Requires Node.js >= 24 per upstream package.json
            nativeBuildInputs = [ pkgs.bun pkgs.makeWrapper ];

            # Uses bun.lock, install dependencies with bun (faster than npm).
            # __noChroot needed because bun needs network access in sandbox.
            __noChroot = true;

            buildPhase = ''
              runHook preBuild
              bun install --no-save --ignore-scripts
              runHook postBuild
            '';

            installPhase = ''
              runHook preInstall

              mkdir -p $out/lib/node_modules/impeccable
              # Strip bun's .cache symlink farm that points to TMPDIR
              rm -rf node_modules/.cache
              cp -r cli package.json node_modules $out/lib/node_modules/impeccable/

              mkdir -p $out/bin
              makeWrapper ${pkgs.nodejs_22}/bin/node \
                $out/bin/impeccable \
                --add-flags "$out/lib/node_modules/impeccable/cli/bin/cli.js"

              runHook postInstall
            '';

            meta = with pkgs.lib; {
              description = "Design guidance for AI coding agents";
              longDescription = ''
                Design skills, commands, and anti-pattern detection for AI coding agents.
                1 skill, 23 commands, live browser iteration, and 44 deterministic detector
                rules for AI-generated frontend design.
              '';
              homepage = "https://impeccable.style";
              license = licenses.asl20;
              mainProgram = "impeccable";
              platforms = systems;
              maintainers = [ ];
            };
          };
        }
      );
    };
}
