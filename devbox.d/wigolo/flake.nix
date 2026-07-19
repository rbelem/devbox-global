{
  description = "wigolo - Local-first web intelligence MCP server for AI coding agents";

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
          version = "0.2.1";

          # Get the real hashes:
          #   1. Set srcHash to pkgs.lib.fakeHash
          #   2. Run: nix build .#default
          #   3. It will fail for srcHash first — copy the "got" hash
          #   4. Then it will fail for npmDepsHash — copy that too
          srcHash = "sha256-vDKh4ExcjH4dbfX0pq2Ds73AtnYyjQsVZ9DZcVKgXOQ=";
          npmDepsHash = "sha256-/Dntq76jW+TZm7k2aDsUSfea1elWO6PBLuYfuECqVAE=";

          # GitHub source provides the lockfile + source files for CLI
          githubSrc = pkgs.fetchFromGitHub {
            owner = "KnockOutEZ";
            repo = "wigolo";
            rev = "v${version}";
            hash = srcHash;
          };

          # npm tarball ships prebuilt dist/ (tsup + tsc output) — use it to
          # avoid running tsup/tsc in the Nix sandbox.
          # Get the hash with: nix-prefetch-url https://registry.npmjs.org/wigolo/-/wigolo-${version}.tgz
          npmDistHash = "sha256-0YS6Jl/wLdq1PyEkA1zVcqCLetjVBxjO/2IMRmNOcDI=";

          npmTarball = pkgs.fetchurl {
            url = "https://registry.npmjs.org/wigolo/-/wigolo-${version}.tgz";
            hash = npmDistHash;
          };

          src = githubSrc;

          # Runtime libs for Playwright's bundled Chromium on NixOS.
          # Derived by `ldd chrome | grep 'not found'` against a bare NixOS env.
          # Re-check when bumping wigolo's playwright version (rare).
          chromiumDeps = pkgs.buildEnv {
            name = "playwright-chromium-deps";
            paths = with pkgs; [
              glib.out nspr nss at-spi2-core dbus.lib alsa-lib cairo
              cups.lib expat libgbm pango.out systemdMinimal
              xorg.libX11 xorg.libxcb xorg.libXcomposite xorg.libXdamage
              xorg.libXext xorg.libXfixes libxkbcommon xorg.libXrandr
            ];
            pathsToLink = [ "/lib" ];
            ignoreCollisions = true;
          };
        in
        {
          default = pkgs.buildNpmPackage rec {
            pname = "wigolo";
            inherit version src npmDepsHash;

            nativeBuildInputs = with pkgs; [
              python3
              pkg-config
              nodejs_22
              makeWrapper
            ];

            buildInputs = with pkgs; [
              glib
              nss
              libsecret
            ];

            npmFlags = [ "--ignore-scripts" ];

            # Skip tsup/tsc build — we inject prebuilt dist/ from the npm
            # tarball in installPhase.
            dontNpmBuild = true;

            installPhase = ''
              runHook preInstall

              # Compile native modules from source. We use nodejs_22's own
              # bundled node-gyp (not pkgs.node-gyp, which is built against
              # Node 24 and embeds Node 24 headers — produces .node bindings
              # that throw `undefined symbol` V8 ABI errors under Node 22).
              # The bundled copy runs under nodejs_22 and resolves headers
              # from the matching include/node dir, so the binding matches
              # the runtime.
              export npm_config_nodedir=${pkgs.nodejs_22}
              node_gyp="${pkgs.nodejs_22}/lib/node_modules/npm/node_modules/node-gyp/bin/node-gyp.js"
              (cd node_modules/better-sqlite3 && node "$node_gyp" rebuild 2>&1)
              (cd node_modules/sqlite-vec && node "$node_gyp" rebuild 2>&1) || true

              # Inject prebuilt dist/ from npm tarball — this avoids running
              # tsup/tsc in the sandbox.
              tar xzf ${npmTarball} --strip=1 -C . package/dist/

              # Replace stub modules in dist/node_modules/ with full copies
              # from root node_modules/. Bundlers may ship only stubs
              # (package.json only); syncing avoids runtime ERR_MODULE_NOT_FOUND
              # from dynamic imports.
              for mod in $(cd "$PWD/dist/node_modules" 2>/dev/null && find . -maxdepth 1 -mindepth 1 -type d -exec basename {} \; && find . -maxdepth 2 -mindepth 2 -path './@*/*' -type d 2>/dev/null | sed 's|^\./||'); do
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
              mkdir -p $out/lib/node_modules/wigolo
              cp -r . $out/lib/node_modules/wigolo/

              # Create bin wrapper
              mkdir -p $out/bin
              makeWrapper ${pkgs.nodejs_22}/bin/node \
                $out/bin/wigolo \
                --add-flags "$out/lib/node_modules/wigolo/dist/index.js" \
                --set NODE_PATH "$out/lib/node_modules" \
                --prefix PATH : ${pkgs.nodejs_22}/bin \
                --prefix LD_LIBRARY_PATH : ${chromiumDeps}/lib

              runHook postInstall
            '';

            meta = with pkgs.lib; {
              description = "Local-first web intelligence MCP server for AI coding agents";
              homepage = "https://github.com/KnockOutEZ/wigolo";
              license = licenses.agpl3Only;
              mainProgram = "wigolo";
              platforms = systems;
            };
          };
        }
      );
    };
}
