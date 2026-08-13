{
  description = "Deepsec - AI-powered vulnerability scanner for any codebase";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { self, nixpkgs }:
    let
      systems = [ "x86_64-linux" ];
      forAllSystems = nixpkgs.lib.genAttrs systems;

      # No upstream tags: pin to a main commit. update-flake shows this as
      # "??" (branch:main fallback) and never auto-updates it — bump manually
      # by updating rev + both hashes below.
      version = "2.3.5"; # mirrors packages/deepsec package.json version
      rev = "d8b133d7079ad35f2d458613d38e09f3e8f111da";

      # Hash capture workflow:
      #   1. set srcHash / pnpmDepsHash to pkgs.lib.fakeHash
      #   2. nix build "path:devbox.d/deepsec#default"
      #   3. paste the sha256-... values from the error messages
      srcHash = "sha256-YnsnXphrSTxkOQQo6NSov2vwH6btBSVn8+H/xgpqSwY=";
      pnpmDepsHash = "sha256-zpyUYw6GUbdYEFKdX9RWX4DtqKqvJJZ0maF8+7UzaJQ=";
    in
    {
      packages = forAllSystems (system:
        let
          pkgs = nixpkgs.legacyPackages.${system};

          src = pkgs.fetchFromGitHub {
            owner = "vercel-labs";
            repo = "deepsec";
            rev = rev;
            hash = srcHash;
            # The upstream pnpm-lock.yaml is v6.0 (pnpm 8 era) — pnpm_10
            # rejects it (ERR_PNPM_LOCKFILE_BREAKING_CHANGE). Vendor a
            # lockfile regenerated with pnpm 10.34.5 (v9.0) so both
            # fetchPnpmDeps and the build see a compatible lockfile.
            # Regenerate: extract upstream, run with pnpm 10:
            #   npm_config_manage_package_manager_versions=false pnpm install --no-frozen-lockfile
            postFetch = ''
              cp ${./pnpm-lock.yaml} $out/pnpm-lock.yaml
              chmod +w $out/pnpm-lock.yaml
            '';
          };
        in
        {
          default = pkgs.stdenv.mkDerivation (finalAttrs: {
            pname = "deepsec";
            inherit version src;

            pnpmDeps = pkgs.fetchPnpmDeps {
              inherit (finalAttrs) pname version src;
              # pnpm_10: the repo ships a pnpm-lock.yaml in v6.0 format and
              # its root package.json pnpm.overrides (CVE fixes) is ignored
              # by pnpm_11 (moved to pnpm-workspace.yaml in v11).
              pnpm = pkgs.pnpm_10;
              fetcherVersion = 4;
              hash = pnpmDepsHash;
            };

            nativeBuildInputs = [
              pkgs.nodejs_22 # engines >= 22; bundle targets node22
              pkgs.pnpm_10
              pkgs.pnpmConfigHook
              pkgs.makeWrapper
            ];

            buildInputs = [ finalAttrs.pnpmDeps ];

            # `bundle` = build @deepsec/core + @deepsec/scanner (tsc), then
            # esbuild-bundle packages/deepsec/src/cli.ts -> dist/cli.mjs.
            # The bundle externalizes the agent SDKs (codex, claude, pi,
            # sandbox, jiti) — they are resolved from node_modules at
            # runtime, so the install phase ships prod deps alongside.
            buildPhase = ''
              runHook preBuild
              pnpm --filter deepsec bundle
              runHook postBuild
            '';

            # The bundle externalizes the agent SDKs (@openai/codex,
            # claude-agent-sdk, pi-coding-agent, @vercel/sandbox, jiti) —
            # they are resolved from node_modules at runtime, so the install
            # ships dist + a production-only node_modules.
            #
            # pnpm deploy is not usable in the sandbox: --legacy re-resolves
            # dependency ranges and fails offline (ERR_PNPM_NO_OFFLINE_META);
            # the injected-workspace variant needs inject-workspace-packages
            # in pnpm-workspace.yaml plus a regenerated lockfile.
            #
            # The copy preserves pnpm's relative symlinks. Links under
            # packages/deepsec/node_modules point 3-4 levels up to the
            # workspace-root virtual store (node_modules/.pnpm) — replicate
            # that exact shape: store view as a sibling of the package.
            installPhase = ''
              runHook preInstall

              # Reinstall from the store with production deps only (dev
              # deps like esbuild/typescript were only needed to bundle).
              # CI=1 confirms the node_modules purge without a TTY.
              CI=1 pnpm install --prod --offline --frozen-lockfile

              mkdir -p $out/lib/node_modules/deepsec/node_modules
              cp -r packages/deepsec/dist packages/deepsec/package.json $out/lib/node_modules/deepsec/
              cp -r packages/deepsec/node_modules/. $out/lib/node_modules/deepsec/node_modules/
              # .bin/deepsec -> ../deepsec/dist/cli.mjs needs the self-link
              ln -s ../../deepsec $out/lib/node_modules/deepsec/node_modules/deepsec
              cp -r node_modules/.pnpm $out/lib/node_modules/.pnpm
              # Workspace packages (file: entries) are linked from the
              # virtual store back to packages/ — copy the source tree so
              # those links resolve. They are esbuild-bundled into
              # cli.mjs, this only keeps the store non-dangling.
              mkdir -p $out/lib
              cp -r packages $out/lib/packages

              mkdir -p $out/bin
              makeWrapper ${pkgs.nodejs_22}/bin/node \
                $out/bin/deepsec \
                --add-flags "$out/lib/node_modules/deepsec/dist/cli.mjs"

              runHook postInstall
            '';

            meta = with pkgs.lib; {
              description = "AI-powered vulnerability scanner for any codebase";
              longDescription = ''
                Deepsec is a security harness for finding vulnerabilities in
                your codebase powered by coding agents. Scans a project with
                regex matchers, investigates candidates with an AI agent
                (codex / claude / pi from PATH), and produces markdown + JSON
                reports.
              '';
              homepage = "https://github.com/vercel-labs/deepsec";
              license = licenses.asl20;
              mainProgram = "deepsec";
              platforms = systems;
              maintainers = [ ];
            };
          });
        });
    };
}
