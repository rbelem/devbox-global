{
  description = "rea - autonomous reverse-engineering agent CLI (npm package rea-agents)";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs =
    { self, nixpkgs }:
    let
      # x86_64-linux only. Four prebuilt native helpers run in this build: turbo
      # (@turbo/linux-64, static), tsc 7 (@typescript/typescript-linux-x64),
      # rolldown (@rolldown/binding-linux-x64-gnu) and the shipped node-pty
      # addon (@lydell/node-pty-linux-x64). Each has a linux-arm64 counterpart
      # in the lockfile, so aarch64-linux looks reachable, but nothing on this
      # host can run an arm64 build to prove it; darwin needs dylib install-name
      # fixing that is likewise untested. Widen `systems` when one is verified.
      systems = [ "x86_64-linux" ];
      forAllSystems = nixpkgs.lib.genAttrs systems;

      # release line: rea-agents-<version> (no leading "v")
      version = "6.8.0";

      # Hash capture workflow:
      #   1. set srcHash / npmDepsHash to the fake hash
      #   2. nix build "path:devbox.d/rea#default"
      #   3. paste the sha256-... values from the error messages
      srcHash = "sha256-2ADn3U3lvUoB4tCEpzO0rMfYE4sis+5uBiEazcp0gpI=";
      npmDepsHash = "sha256-3WPXD+qm5WVfrTEvepKwX5RZBfbLBcPB0uDmKIx4MR8=";
    in
    {
      packages = forAllSystems (
        system:
        let
          pkgs = nixpkgs.legacyPackages.${system};

          src = pkgs.fetchFromGitHub {
            owner = "morluto";
            repo = "rea";
            rev = "rea-agents-${version}";
            hash = srcHash;
          };

          # engines as of 6.8.0: ^22.23.4 || ^24.22.1 || >=26.12.1, with
          # engine-strict set in .npmrc. nixpkgs nodejs_24 is 24.21.0, under
          # that floor, so the built line is nodejs_26 (26.13.0).
          nodejs = pkgs.nodejs_26;
        in
        {
          default = pkgs.buildNpmPackage {
            pname = "rea-agents";
            inherit
              version
              src
              npmDepsHash
              nodejs
              ;

            # The whole tree has exactly one install script (frida's binary
            # downloader, an optional dependency) and no package in the build
            # chain needs node-gyp. Skipping lifecycle scripts keeps the build
            # offline-safe; see the installPhase note about frida.
            npmFlags = [ "--ignore-scripts" ];

            # scripts/prepare.mjs installs husky when src/ and node_modules/husky
            # both exist; HUSKY=0 makes it self-skip instead of failing on a
            # checkout with no .git.
            env = {
              HUSKY = "0";
              CI = "1";
              TURBO_TELEMETRY_DISABLED = "1";
              TURBO_NO_DAEMON = "1";
              DO_NOT_TRACK = "1";
            };

            nativeBuildInputs = [
              pkgs.makeWrapper
              # @lydell/node-pty's pty.node and the prebuilt @tsrs platform
              # binary are the ELF objects in the shipped tree; they need
              # libstdc++/libgcc from buildInputs below.
              pkgs.autoPatchelfHook
            ];
            buildInputs = [ pkgs.stdenv.cc.cc.lib ];

            # `npm run build` drives turbo, whose default cache lives inside
            # node_modules; keep it in $TMPDIR so the tree copied into $out
            # carries no build cache. LD_LIBRARY_PATH is for the build itself:
            # scripts/bundle-runtime.mjs dlopens rolldown's binding, which needs
            # libgcc_s/libstdc++ that autoPatchelfHook only adds to its RUNPATH
            # later, in fixupPhase.
            preBuild = ''
              export TURBO_CACHE_DIR="$TMPDIR/turbo-cache"
              export LD_LIBRARY_PATH="${pkgs.lib.makeLibraryPath [ pkgs.stdenv.cc.cc.lib ]}"

              # @tsrs (new in 6.8.0) is a prebuilt Rust binary whose ELF
              # interpreter is /lib64/ld-linux-x86-64.so.2, which does not
              # exist here; `npm run compile` executes it, so patch it before
              # fixupPhase gets a chance to.
              for tsrs_bin in node_modules/@tsrs/*/tsrs; do
                if [ -e "$tsrs_bin" ]; then
                  patchelf --set-interpreter \
                    "${pkgs.stdenv.cc.libc}/lib/ld-linux-x86-64.so.2" "$tsrs_bin"
                fi
              done
            '';

            # Root package.json has no main; both bins (rea, rea-agents) point
            # at scripts/rea.mjs, which resolves the package root from its own
            # path and imports ../package.json. nixpkgs' install hook would
            # symlink those bins under their `#!/usr/bin/env node` shebang, so
            # it is replaced: `npm pack` reproduces the published file set
            # (package.json "files" decides dist/, skills/, bridge/ and
            # third_party/ land where the CLI reads them, with no
            # hand-maintained list to drift on a bump) and the CLI is wrapped
            # around an absolute node.
            dontNpmInstall = true;

            installPhase = ''
              runHook preInstall

              packageOut=$out/lib/node_modules/rea-agents
              mkdir -p "$packageOut" "$TMPDIR/pack"

              # `npm pack` writes to the npm cache and the dependency cache is
              # read-only here, so point npm at a throwaway one (nixpkgs' own
              # install hook does the same).
              npm_config_cache="$TMPDIR/npm-pack-cache" \
                npm pack --ignore-scripts --no-foreground-scripts \
                  --loglevel=error --pack-destination "$TMPDIR/pack"
              tar -xzf "$TMPDIR/pack"/rea-agents-*.tgz \
                -C "$packageOut" --strip-components=1

              # Runtime dependencies only: devDeps (typescript, turbo, vitest,
              # oxlint, vitepress, ...) are build-time only and dominate the
              # closure.
              npm prune --omit=dev --no-save $npmFlags

              # frida (an optional dependency) runs a meson/node-gyp build in its
              # install script; with --ignore-scripts only sources and test
              # fixtures survive, and dist/ reaches it through a lazy
              # `import("frida")`, so dropping it costs nothing this build could
              # have provided.
              rm -rf node_modules/frida

              cp -r node_modules "$packageOut/node_modules"

              mkdir -p $out/bin
              makeWrapper ${nodejs}/bin/node $out/bin/rea \
                --add-flags "$packageOut/scripts/rea.mjs" \
                --suffix PATH : ${
                  pkgs.lib.makeBinPath [
                    pkgs.git
                    # every bridge/*.py provider (hopper, ghidra, cutter, lldb,
                    # mitmproxy, pwntools) shells out to python3
                    pkgs.python3
                  ]
                }
              ln -s rea $out/bin/rea-agents

              runHook postInstall
            '';

            meta = with pkgs.lib; {
              description = "Autonomous reverse-engineering agent for the terminal and for coding agents";
              longDescription = ''
                rea drives static and dynamic reverse-engineering workflows
                (native, JavaScript/Electron, Android, firmware, protocol
                captures) from one CLI, and exposes the same surface to coding
                agents over MCP (`rea mcp`).

                Built from source at tag rea-agents-${version} and installed in
                the layout npm publishes. External reverse-engineering hosts are
                not bundled: Ghidra, Hopper, IDA, Cutter, jadx, adb and the
                debuggers come from the caller's environment, and frida (an
                optional upstream dependency that downloads a binary when its
                install script runs) is not installed by this derivation.
              '';
              homepage = "https://github.com/morluto/rea";
              license = licenses.mit;
              mainProgram = "rea";
              platforms = systems;
              maintainers = [ ];
            };
          };
        }
      );
    };
}
