{
  description = "impeccable - design guidance for AI coding agents";

  # release-prefix: cli-v

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { self, nixpkgs }:
    let
      systems = [ "x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin" ];
      forAllSystems = nixpkgs.lib.genAttrs systems;

      version = "3.2.0";
    in
    {
      packages = forAllSystems (system:
        let
          pkgs = import nixpkgs { inherit system; };

          srcOrig = pkgs.fetchFromGitHub {
            owner = "pbakaus";
            repo = "impeccable";
            rev = "cli-v${version}";
            hash = "sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
          };

          # Inject the package-lock.json (generated from bun.lock) into source.
          # buildNpmPackage needs package-lock.json to use fetchNpmDeps + --offline.
          # The lockfile is regenerated when deps change via bun2npm-lock helper.
          src = pkgs.runCommand "impeccable-src" { } ''
            cp -r ${srcOrig} $out
            chmod +w $out
            cp ${./package-lock.json} $out/package-lock.json
          '';

          # Pre-fetched npm dependencies — no network needed in sandbox.
          # fetchNpmDeps needs src to be a directory containing package-lock.json.
          npmDepsSrc = pkgs.runCommand "npm-deps-src" { } ''
            mkdir -p $out
            cp ${./package-lock.json} $out/package-lock.json
          '';
          npmDeps = pkgs.fetchNpmDeps {
            name = "impeccable-npm-deps";
            src = npmDepsSrc;
            hash = "sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
          };
        in
        {
          default = pkgs.buildNpmPackage {
            pname = "impeccable";
            inherit version src npmDeps;

            # Requires Node.js >= 24 per upstream package.json
            nativeBuildInputs = [ pkgs.makeWrapper ];

            # Suppress browser downloads during npm install (puppeteer, playwright)
            PUPPETEER_SKIP_BROWSER_DOWNLOAD = 1;
            PUPPETEER_SKIP_DOWNLOAD = 1;
            PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = 1;

            # No npm build step — just install deps and copy files
            dontNpmBuild = true;
            dontNpmPrune = true;

            installPhase = ''
              runHook preInstall

              mkdir -p $out/lib/node_modules/impeccable
              # Strip bun's .cache — created if --no-save is not fully effective
              rm -rf node_modules/.cache 2>/dev/null || true
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
