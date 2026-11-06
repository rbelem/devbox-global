{
  description = "wigolo (main branch) - Local-first web intelligence MCP server for AI coding agents";

  inputs = {
    # Pinned to stable wigolo's nixpkgs: newer libcs need GLIBC_2.43, ambient profile ships 2.42 — bump together
    nixpkgs.url = "github:NixOS/nixpkgs/241313f4e8e508cb9b13278c2b0fa25b9ca27163";
  };

  outputs =
    { self, nixpkgs }:
    let
      # Re-point these four to track a new rev (e.g. the rbelem PR
      # branch), then refresh the hashes via the fakeHash loop below.
      #
      # Tracks the fork's main, rebased onto upstream v0.3.1 and carrying 22
      # commits on top: the key-gated DeepSeek engine, the resident-memory work
      # (gzipped cache, cache compaction, hosted inference), installed-browser
      # support (Flatpak Chrome/Brave), the review round that moved hosted
      # reranking off the fetch path and made credentials env/keychain-only, and
      # the browser-PROCESS idle close (upstream only reaps contexts). The
      # embedder/reranker idle release is upstream's own now, so this branch no
      # longer carries a second copy. None of the fork's commits are in a
      # release yet; re-pin to upstream once they are.
      owner = "rbelem";
      repo = "wigolo";
      rev = "25ec06f4b033f80215b230253a94a0d3be95d71a";
      version = "0.3.1-git.25ec06f4";

      # Get the real hashes:
      #   1. Set srcHash/npmDepsHash to pkgs.lib.fakeHash
      #   2. Run: nix build ./devbox.d/wigolo-git#default
      #   3. It will fail for srcHash first — copy the "got" hash
      #   4. Then it will fail for npmDepsHash — copy that too
      srcHash = "sha256-xflK5YehmRd4rjB/8c14aPBJBY0ZxuQmkOpe50QErYY=";
      npmDepsHash = "sha256-p1L8ohMXZlRuGbgK0TUgycc8LLaYr8CtaCcbMLMUZxs=";

      systems = [ "x86_64-linux" ];
      forAllSystems = nixpkgs.lib.genAttrs systems;
    in
    {
      packages = forAllSystems (
        system:
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
          #
          # DUPLICATED ON PURPOSE — one list, two literal copies. Keep in sync.
          #
          # The other copy is the wigolo checkout's
          # `devbox.d/playwright-libs/flake.nix`:
          #   /home/rodrigo/Workspace/github.com/KnockOutEZ/wigolo
          # Neither file can own the list for the other: this flake builds a
          # FETCHED wigolo source instead of that checkout's tree (and cannot
          # import a file of ours from `src` either — the pinned rev predates
          # one), while that flake has to evaluate with no network fetch. So:
          # one list, one owner (the wigolo checkout — its package.json
          # Playwright version drives `ldd`), two literal copies.
          #
          # TRIGGER is a Playwright bump: the version in package.json pulls a
          # new chrome-headless-shell, and that is the only thing that changes
          # the set. In ONE change: re-run
          # `ldd chrome-headless-shell | grep 'not found'` against a bare NixOS
          # env, edit BOTH lists, update BOTH attestation hashes below, and keep
          # both flakes' nixpkgs pins equal (see the input comment at the top:
          # same rev, GLIBC_2.43 boundary).
          #
          # BEGIN ATTESTED SET — sha256
          # 2ee112dd9b920ed96127e37d476a1182631408832b3b5527d4c3659ba4f17e63
          # sha256 of the sorted attribute names, one per line, trailing newline
          # included. The string is identical in both copies, so a hash that no
          # longer matches its own list — or two hashes that differ — is drift.
          #   alsa-lib, at-spi2-core, cairo, cups.lib, dbus.lib, expat,
          #   glib.out, libgbm, libx11, libxcb, libxcomposite, libxdamage,
          #   libxext, libxfixes, libxkbcommon, libxrandr, nspr, nss,
          #   pango.out, systemdMinimal
          # END ATTESTED SET
          #
          # Compare the two copies without reading them (empty = in sync):
          #   diff <(sed -n '/BEGIN ATTESTED SE[T]/,/END ATTESTED SE[T]/p' \
          #           devbox.d/wigolo-git/flake.nix) \
          #        <(sed -n '/BEGIN ATTESTED SE[T]/,/END ATTESTED SE[T]/p' \
          #           /home/rodrigo/Workspace/github.com/KnockOutEZ/wigolo/devbox.d/playwright-libs/flake.nix)
          chromiumDeps = sysPkgs.buildEnv {
            name = "playwright-chromium-deps";
            paths = with sysPkgs; [
              glib.out
              nspr
              nss
              at-spi2-core
              dbus.lib
              alsa-lib
              cairo
              cups.lib
              expat
              libgbm
              pango.out
              systemdMinimal
              # Non-output-prefixed attributes: the `xorg.*` aliases are
              # deprecated in current nixpkgs and warn on every evaluation.
              libx11
              libxcb
              libxcomposite
              libxdamage
              libxext
              libxfixes
              libxkbcommon
              libxrandr
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
