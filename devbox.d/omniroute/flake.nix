{
  description = "OmniRoute - Unified AI router with 160+ providers, auto fallback, MCP/A2A";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs = { self, nixpkgs }:
    let
      systems = [ "x86_64-linux" ];
      forAllSystems = nixpkgs.lib.genAttrs systems;
    in
    {
      packages = forAllSystems (system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
          version = "3.8.48";

          # Get the real hashes:
          #   1. Set srcHash to pkgs.lib.fakeHash or comment out
          #   2. Run: nix build .#default
          #   3. It will fail for srcHash first — copy the "got" hash
          #   4. Then it will fail for npmDepsHash — copy that too
          srcHash = "sha256-lqw0M0mHqsMWWvz7X+3sO+FbaVmJ9bL9FBgB5HxsUBI=";
          npmDepsHash = "sha256-pVq6fpF0d1FeJmZm4rGcV0wjpoFcDmlhY254Muo00qI=";

          # GitHub source provides the lockfile + source files for CLI
          githubSrc = pkgs.fetchFromGitHub {
            owner = "diegosouzapw";
            repo = "OmniRoute";
            rev = "v${version}";
            hash = srcHash;
          };

          # npm tarball ships prebuilt dist/ (Next.js standalone bundle with
          # fonts etc.) — use it to avoid running `next build` in the Nix
          # sandbox where font downloads fail due to no network.
          # Get the hash with: nix-prefetch-url https://registry.npmjs.org/omniroute/-/omniroute-${version}.tgz
          npmDistHash = "sha256-sJXyyGId+zdaSRDtYkMOhz7abuuRm1ZU1AeyHFk4MlU=";

          npmTarball = pkgs.fetchurl {
            url = "https://registry.npmjs.org/omniroute/-/omniroute-${version}.tgz";
            hash = npmDistHash;
          };

          src = githubSrc;
        in
        {
          default = pkgs.buildNpmPackage rec {
            pname = "omniroute";
            inherit version src npmDepsHash;

            nativeBuildInputs = with pkgs; [
              python3
              pkg-config
              nodejs_22
            ];

            buildInputs = with pkgs; [
              glib
              nss
              libsecret
            ];

            npmFlags = [ "--ignore-scripts" ];

            # Skip the heavy Next.js build (next build needs Google Fonts fetch
            # which fails in Nix sandbox). We inject the prebuilt dist/ from
            # the npm tarball in installPhase instead.
            dontNpmBuild = true;

            installPhase = ''
              runHook preInstall

              # Compile native modules from source using node-gyp directly.
              # npm rebuild / prebuild-install may fetch a CI binary compiled
              # against a newer V8 than runtime Node 22.23.1 — force source
              # compilation so the binary matches the Nix-built Node.js.
              (cd node_modules/better-sqlite3 && node ../.bin/node-gyp rebuild 2>&1)
              (cd node_modules/wreq-js && node ../.bin/node-gyp rebuild 2>&1) || true

              # Inject prebuilt dist/ from npm tarball — this avoids running
              # the Next.js build (next/font/google fetches fail in sandbox)
              tar xzf ${npmTarball} --strip=1 -C . package/dist/

              # Replace stub modules in dist/node_modules/ with full copies
              # from root node_modules/. The Next.js standalone bundles only
              # a subset; packages like ioredis, undici, etc. end up as
              # stubs (package.json only). Syncing all stubs avoids runtime
              # ERR_MODULE_NOT_FOUND from dynamic imports (MCP, etc.).
              for mod in $(cd "$PWD/dist/node_modules" && find . -maxdepth 1 -mindepth 1 -type d -exec basename {} \; && find . -maxdepth 2 -mindepth 2 -path './@*/*' -type d 2>/dev/null | sed 's|^\./||'); do
                rootDir="$PWD/node_modules/$mod"
                distDir="$PWD/dist/node_modules/$mod"
                if [ -d "$rootDir" ] && [ -d "$distDir" ]; then
                  distFiles=$(find "$distDir" -maxdepth 1 -type f 2>/dev/null | wc -l)
                  if [ "$distFiles" -le 1 ]; then
                    echo "[nix] Syncing stub module: $mod"
                    rm -rf "$distDir"
                    cp -r "$rootDir" "$distDir"
                  fi
                fi
              done

              # Copy the package to $out
              mkdir -p $out/lib/node_modules/omniroute
              cp -r . $out/lib/node_modules/omniroute/

              # Create bin wrappers
              mkdir -p $out/bin
              for bin in omniroute omniroute-reset-password; do
                makeWrapper ${pkgs.nodejs}/bin/node \
                  $out/bin/$bin \
                  --add-flags "$out/lib/node_modules/omniroute/bin/$bin.mjs" \
                  --set NODE_PATH "$out/lib/node_modules" \
                  --prefix PATH : ${pkgs.nodejs}/bin
              done

              runHook postInstall
            '';

            meta = with pkgs.lib; {
              description = "Unified AI router with 160+ providers, RTK+Caveman compression, auto fallback, MCP/A2A";
              homepage = "https://github.com/diegosouzapw/OmniRoute";
              license = licenses.mit;
              mainProgram = "omniroute";
              platforms = systems;
            };
          };
        }
      );
    };
}
