{
  description = "prime-agent - self-improving recursive language model (RLM) agent for coding workflows";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { self, nixpkgs }:
    let
      systems = [ "x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin" ];
      forAllSystems = nixpkgs.lib.genAttrs systems;

      version = "0.7.1";
    in
    {
      packages = forAllSystems (system:
        let
          pkgs = nixpkgs.legacyPackages.${system};

          # Get the real npmDepsHash:
          #   1. Set npmDepsHash to pkgs.lib.fakeHash
          #   2. Run: devbox global install
          #   3. Replace with the hash from the error message
          npmDepsHash = "sha256-cbWtDijm3gFlERFeajsN7+jV+LeFxgZPwxVii2JHF4A=";

          src0 = pkgs.fetchFromGitHub {
            owner = "PrimeIntellect-ai";
            repo = "prime-agent";
            rev = "v${version}";
            hash = "sha256-TaDa5Iflg6eGW9Hzd6alAcwF8PU0SBG2MCLiM313YqY=";
          };

          # Upstream package-lock.json is missing `resolved`/`integrity` for
          # ~62% of packages (npm/cli#6301) — prefetch-npm-deps can't cache
          # them and the build's `npm ci` fails with ENOTCACHED. Replace the
          # lockfile with a regenerated one (npm install --package-lock-only).
          # Also add @opentelemetry/api (optional peer of @mistralai/mistralai)
          # to coding-agent deps — it's missing from the lockfile and esbuild
          # fails to bundle without it. This must be done on the SOURCE (not a
          # patchPhase), because the npm-deps fixed-output fetcher consumes the
          # raw src.
          src = pkgs.runCommand "prime-agent-src" { } ''
            cp -r ${src0} $out
            chmod -R u+w $out
            cp ${./package-lock.json} $out/package-lock.json
            cp ${./coding-agent-package.json} $out/packages/coding-agent/package.json
          '';
        in
        {
          default = pkgs.buildNpmPackage rec {
            pname = "prime-agent";
            inherit version src npmDepsHash;

            # Requires Node.js >= 22.8.0 per upstream engines field
            nodejs = pkgs.nodejs_22;

            # v1 fetcher's only-if-cached misses @anthropic-ai/sandbox-runtime
            # (ENOTCACHED); v2 fetches the full dep tree directly.
            npmDepsFetcherVersion = 2;

            # Root package.json has no bin/main; the CLI lives in the
            # coding-agent workspace. Install manually (pattern: aicommits).
            dontNpmInstall = true;

            # packages/ai build re-runs `generate-models`, which fetches model
            # catalogs from models.dev/openrouter.ai — no network in the Nix
            # sandbox, and the failed run overwrites the committed
            # models.generated.ts with a partial file that breaks tsgo.
            # The repo ships the generated file; skip regeneration.
            patchPhase = ''
              runHook prePatch
              substituteInPlace packages/ai/package.json \
                --replace-fail '"build": "npm run generate-models && tsgo -p tsconfig.build.json"' \
                              '"build": "tsgo -p tsconfig.build.json"'
              runHook postPatch
            '';

            # The `canvas` npm package runs node-gyp during npm ci (postinstall)
            # and needs pkg-config + cairo/pixman/etc. to configure.
            nativeBuildInputs = [ pkgs.makeWrapper pkgs.pkg-config ];
            buildInputs = [
              pkgs.cairo
              pkgs.pango
              pkgs.pixman
              pkgs.freetype
              pkgs.fontconfig
              pkgs.libpng
              pkgs.libjpeg
              pkgs.giflib
            ];

            installPhase = ''
              runHook preInstall

              mkdir -p $out/lib/node_modules/prime-agent
              cp -r packages/coding-agent/dist packages/coding-agent/package.json $out/lib/node_modules/prime-agent/

              # The esbuild bundle keeps 5 native/lazy deps external
              # (zeromq, koffi, undici, @silvia-odwyer/photon-node,
              # @mariozechner/clipboard) — resolved from node_modules at
              # runtime via createRequire. Keep the production tree.
              npm prune --omit=dev
              cp -rL node_modules $out/lib/node_modules/prime-agent/node_modules

              mkdir -p $out/bin
              makeWrapper ${pkgs.nodejs_22}/bin/node \
                $out/bin/prime-agent \
                --add-flags "$out/lib/node_modules/prime-agent/dist/bundle/cli.js" \
                --prefix PATH : ${pkgs.python3}/bin

              runHook postInstall
            '';

            meta = with pkgs.lib; {
              description = "Self-improving recursive language model (RLM) agent for coding workflows";
              longDescription = ''
                Prime Agent is an open-source self-improving RLM agent for coding
                workflows and long-running autonomous tasks. Persistent IPython,
                subagents, daemon-backed sessions, a harness that can refine itself
                via /refine, and a TUI.
              '';
              homepage = "https://github.com/PrimeIntellect-ai/prime-agent";
              license = licenses.mit;
              mainProgram = "prime-agent";
              platforms = systems;
              maintainers = [ ];
            };
          };
        }
      );
    };
}