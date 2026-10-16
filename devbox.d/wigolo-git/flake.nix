{
  description = "wigolo (main branch) - Local-first web intelligence MCP server for AI coding agents";

  inputs = {
    # Pinned to stable wigolo's nixpkgs: newer libcs need GLIBC_2.43, ambient profile ships 2.42 — bump together
    nixpkgs.url = "github:NixOS/nixpkgs/241313f4e8e508cb9b13278c2b0fa25b9ca27163";
  };

  outputs = { self, nixpkgs }:
    let
      # Re-point these four to track a new rev (e.g. the rbelem PR
      # branch), then refresh the hashes via the fakeHash loop below.
      owner = "rbelem";
      repo = "wigolo";
      rev = "d85bfc8d28a6eb50776a6e670e954e7108d505cf";
      version = "0.2.1-git.d85bfc8d";

      # Get the real hashes:
      #   1. Set srcHash/npmDepsHash to pkgs.lib.fakeHash
      #   2. Run: nix build ./devbox.d/wigolo-git#default
      #   3. It will fail for srcHash first — copy the "got" hash
      #   4. Then it will fail for npmDepsHash — copy that too
      srcHash = "sha256-Js8QbcmBxGZ8OuFX3eH1KfdO8wdaUiWrJE5vB5hO4hA=";
      npmDepsHash = "sha256-hBOgrqGnzKIMDCCkg3RPmXS2KRWbn8HZBZmgdqtHU5Q=";

      systems = [ "x86_64-linux" ];
      forAllSystems = nixpkgs.lib.genAttrs systems;
    in
    {
      packages = forAllSystems (system:
        let
          sysPkgs = nixpkgs.legacyPackages.${system};

          githubSrc = sysPkgs.fetchFromGitHub {
            inherit owner repo rev;
            hash = srcHash;
          };

          src = githubSrc;

          # Runtime libs for Playwright's bundled Chromium on NixOS.
          # Derived by `ldd chrome | grep 'not found'` against a bare NixOS env.
          # Re-check when bumping wigolo's playwright version (rare).
          chromiumDeps = sysPkgs.buildEnv {
            name = "playwright-chromium-deps";
            paths = with sysPkgs; [
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
          default = sysPkgs.buildNpmPackage {
            pname = "wigolo-git";
            inherit version src npmDepsHash;

            nativeBuildInputs = with sysPkgs; [
              python3
              pkg-config
              nodejs_22
              makeWrapper
            ];

            buildInputs = with sysPkgs; [
              glib
              nss
              libsecret
            ];

            npmFlags = [ "--ignore-scripts" ];

            # Run the real upstream build (`tsup && tsc -p
            # tsconfig.build.json`). No npm dist tarball exists for
            # main, so dontNpmBuild stays off.
            npmBuildScript = "build";

            installPhase = ''
              runHook preInstall

              # Compile native modules from source. We use nodejs_22's own
              # bundled node-gyp (not pkgs.node-gyp, which is built against
              # Node 24 and embeds Node 24 headers — produces .node bindings
              # that throw `undefined symbol` V8 ABI errors under Node 22).
              # The bundled copy runs under nodejs_22 and resolves headers
              # from the matching include/node dir, so the binding matches
              # the runtime.
              export npm_config_nodedir=${sysPkgs.nodejs_22}
              node_gyp="${sysPkgs.nodejs_22}/lib/node_modules/npm/node_modules/node-gyp/bin/node-gyp.js"
              (cd node_modules/better-sqlite3 && node "$node_gyp" rebuild 2>&1)
              (cd node_modules/sqlite-vec && node "$node_gyp" rebuild 2>&1) || true

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
              makeWrapper ${sysPkgs.nodejs_22}/bin/node \
                $out/bin/wigolo \
                --add-flags "$out/lib/node_modules/wigolo/dist/index.js" \
                --set NODE_PATH "$out/lib/node_modules" \
                --prefix PATH : ${sysPkgs.nodejs_22}/bin \
                --prefix LD_LIBRARY_PATH : ${chromiumDeps}/lib

              runHook postInstall
            '';

            meta = with sysPkgs.lib; {
              description = "Local-first web intelligence MCP server for AI coding agents (main branch build)";
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
