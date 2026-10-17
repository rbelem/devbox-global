{
  description = "od - open-design: local-first design product (CLI, local daemon, web UI)";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { self, nixpkgs }:
    let
      # Linux only. The workspace resolves native and prebuilt platform packages
      # per host (better-sqlite3/node-pty source builds, @img/sharp-linux-*,
      # @next/swc-linux-*, @ffmpeg-installer/linux-*), and upstream ships a Linux
      # container only.
      systems = [ "x86_64-linux" "aarch64-linux" ];
      forAllSystems = nixpkgs.lib.genAttrs systems;

      # release-prefix: open-design-v
      version = "0.25.0"; # tag open-design-v0.25.0 (root package.json agrees)

      # Hash capture workflow:
      #   1. set srcHash / pnpmDepsHash to pkgs.lib.fakeHash
      #   2. nix build "path:devbox.d/open-design#default"
      #   3. paste the sha256-... values from the error messages
      srcHash = "sha256-l7qTQ5XTKpuAw48zbRXp+T58XUIvq8MHDOzmus7Gnj0=";
      pnpmDepsHash = "sha256-IssWrZppDVJ5Rutgguycbf9/HQgAy+ROaKpfC0dTViQ=";
    in
    {
      packages = forAllSystems (system:
        let
          pkgs = nixpkgs.legacyPackages.${system};

          src = pkgs.fetchFromGitHub {
            owner = "nexu-io";
            repo = "open-design";
            rev = "open-design-v${version}";
            hash = srcHash;
          };
        in
        {
          default = pkgs.stdenv.mkDerivation (finalAttrs: {
            pname = "open-design";
            inherit version src;

            pnpmDeps = pkgs.fetchPnpmDeps {
              inherit (finalAttrs) pname version src;
              # Lockfile is pnpm 10 (lockfileVersion 9.0) and package.json pins
              # packageManager pnpm@10.33.2; pnpm_10 is the same major, the
              # lockfile resolves unchanged.
              pnpm = pkgs.pnpm_10;
              fetcherVersion = 4;
              hash = pnpmDepsHash;
            };

            nodejs = pkgs.nodejs_24; # engines: node ~24
            pnpm = pkgs.pnpm_10;

            nativeBuildInputs = [
              pkgs.nodejs_24
              pkgs.pnpm_10
              pkgs.pnpmConfigHook
              pkgs.makeWrapper
              # node-gyp for the two source-built addons (better-sqlite3, node-pty).
              pkgs.python3
              pkgs.gnumake
              pkgs.gcc
              pkgs.pkg-config
            ];

            buildInputs = [ finalAttrs.pnpmDeps ];

            env = {
              CI = "1";
              NEXT_TELEMETRY_DISABLED = "1";
              # apps/desktop is in the workspace graph, so pnpm considers electron
              # (a pnpm.onlyBuiltDependencies entry) and its postinstall would fetch
              # a ~100 MB binary. We do not ship the desktop shell.
              ELECTRON_SKIP_BINARY_DOWNLOAD = "1";
              # package.json pins packageManager pnpm@10.33.2. Without this, every
              # `pnpm` we invoke (the hook's install, the postinstall's per-target
              # builds) tries to download that exact version first.
              npm_config_manage_package_manager_versions = "false";
            };

            # buildAddon compiles one workspace-shipped native addon with node-gyp, and
            # is used from both buildPhase (before the workspace build, because
            # scripts/postinstall.mjs probes better-sqlite3 and shells out to
            # `pnpm rebuild` when the probe fails) and installPhase (after
            # `pnpm install --prod`, which re-materializes node_modules from the
            # store). node-gyp comes from the npm that ships inside our nodejs, the
            # only node-gyp guaranteed to match the node ABI and to find the headers
            # in $nodejs/include/node.
            postPatch = ''
              buildAddon() {
                local root="$1" name="$2"
                local -a matches=("$root"/node_modules/.pnpm/"$name"@*/node_modules/"$name")
                if [ "''${#matches[@]}" -ne 1 ] || [ ! -d "''${matches[0]}" ]; then
                  echo "buildAddon: expected exactly one $name under $root, found ''${#matches[@]}" >&2
                  exit 1
                fi
                echo "buildAddon: node-gyp rebuild $name in "''${matches[0]}
                ( cd "''${matches[0]}" && rm -rf build &&
                  node "${finalAttrs.nodejs}/lib/node_modules/npm/node_modules/node-gyp/bin/node-gyp.js" \
                    rebuild --nodedir="${finalAttrs.nodejs}" )
              }
            '';

            buildPhase = ''
              runHook preBuild

              # better-sqlite3 before the workspace build: scripts/postinstall.mjs
              # probes the addon and, when the probe fails, shells out to
              # `pnpm rebuild`, which cannot reach the network here.
              buildAddon "$PWD" better-sqlite3

              # Every workspace target in dependency order (packages/*, apps/daemon,
              # tools/*). The Dockerfile gets this from the root package.json
              # "postinstall" hook during `pnpm install`; pnpmConfigHook installs with
              # --ignore-scripts, so run it directly. apps/web is not a target.
              node ./scripts/postinstall.mjs

              # Next.js static export for the daemon's STATIC_DIR (apps/web/out).
              pnpm --filter @open-design/web build

              runHook postBuild
            '';

            installPhase = ''
              runHook preInstall

              # The daemon locates everything by walking up two levels from
              # apps/daemon/dist (resolveProjectRoot in apps/daemon/src/project-root.ts),
              # so the shipped tree keeps the workspace shape the daemon expects at
              # that root.
              OD_ROOT=$out/lib/open-design
              mkdir -p "$OD_ROOT/apps"

              # Prune the workspace to production dependencies in place. The
              # Dockerfile gets the same effect from
              # `pnpm --filter @open-design/daemon deploy --legacy --prod`, but that
              # implementation re-resolves the workspace and asks the registry for
              # metadata about dependency ranges; offline it aborts with
              # ERR_PNPM_NO_OFFLINE_META (observed on the @deepseek-ai/* peer ranges
              # and on zod@3.25.76). A frozen offline install resolves nothing.
              pnpm install --prod --frozen-lockfile --offline --ignore-scripts

              # The prune re-materializes packages from the store, so the addons are
              # compiled after it, in the tree that ships. node-pty@1.1.0 ships
              # prebuilds for darwin/win32 only and is not in
              # pnpm.onlyBuiltDependencies, so upstream's own install never builds a
              # Linux addon.
              buildAddon . better-sqlite3
              buildAddon . node-pty

              # Load both addons the way the daemon does, through the shipped
              # workspace layout, so a missing binding or a wrong-ABI binary fails the
              # build instead of the first request.
              node -e '
                const { createRequire } = require("node:module");
                const req = createRequire(process.argv[1] + "/apps/daemon/dist/cli.js");
                const Database = req("better-sqlite3");
                new Database(":memory:").exec("create table t(a)");
                req("node-pty");
                console.log("shipped addons load: better-sqlite3, node-pty");
              ' "$PWD"

              cp -a apps/daemon "$OD_ROOT/apps/daemon"
              cp -a node_modules packages "$OD_ROOT/"
              cp package.json pnpm-workspace.yaml "$OD_ROOT/"

              # pnpm's hoisted alias directory carries one link per workspace member.
              # Members outside the daemon's production closure (tools/*, e2e,
              # shells/*, apps/{desktop,closure,packaged}) are not shipped, so their
              # aliases point at nothing. The daemon resolves its own @open-design/*
              # dependencies through apps/daemon/node_modules, so drop the dangling
              # aliases and leave fixupPhase's noBrokenSymlinks check meaning what it
              # says for everything else.
              find "$OD_ROOT/node_modules/.pnpm/node_modules/@open-design" -xtype l -print -delete

              mkdir -p "$OD_ROOT/apps/web"
              cp -r apps/web/out "$OD_ROOT/apps/web/out"

              # PROJECT_ROOT-relative resource dirs read in apps/daemon/src/server.ts.
              # The Dockerfile omits design-templates and plugins/registry, both of
              # which the daemon resolves there; ship them so those surfaces work.
              cp -r skills design-systems design-templates craft prompt-templates data "$OD_ROOT/"
              mkdir -p "$OD_ROOT/plugins" "$OD_ROOT/assets"
              cp -r plugins/_official plugins/registry "$OD_ROOT/plugins/"
              cp -r assets/frames assets/community-pets "$OD_ROOT/assets/"

              # @ffmpeg-installer/linux-x64 fixes its binary's mode in an install
              # script, which pnpm 10's build-script allowlist blocks. ffmpeg ships
              # 0755 in its tarball so it survives; resolve it the way the daemon does,
              # from the shipped tree, and assert that instead of trusting it.
              FFMPEG=$(cd "$OD_ROOT/apps/daemon" && node -e 'process.stdout.write(require("@ffmpeg-installer/ffmpeg").path)')
              test -x "$FFMPEG"

              mkdir -p $out/bin
              # PATH for what the daemon shells out to: node/npm/npx (MCP servers and
              # agent CLIs it spawns), git (version-control features), bash (terminal
              # sessions and SHELL fallbacks) and poppler-utils (pdftotext in
              # document-preview.ts).
              makeWrapper ${finalAttrs.nodejs}/bin/node $out/bin/od \
                --add-flags "$OD_ROOT/apps/daemon/dist/cli.js" \
                --prefix PATH : ${pkgs.lib.makeBinPath [
                  pkgs.nodejs_24
                  pkgs.git
                  pkgs.bashInteractive
                  pkgs.poppler-utils
                ]} \
                --set-default SHELL ${pkgs.bashInteractive}/bin/bash \
                --run 'if [ -z "''${OD_DATA_DIR-}" ]; then
                  export OD_DATA_DIR="''${XDG_STATE_HOME:-$HOME/.local/state}/open-design"
                  mkdir -p "$OD_DATA_DIR"
                fi'
              ln -s od $out/bin/open-design

              runHook postInstall
            '';

            meta = with pkgs.lib; {
              description = "Local-first design product: CLI, local daemon and web UI";
              longDescription = ''
                open-design detects an installed code-agent CLI, runs design skills
                and design systems, and streams artifacts into a sandboxed preview.

                `od` starts the local daemon on http://127.0.0.1:7456 (OD_PORT) and
                serves the web UI from it. `--no-open` skips the browser launch.
                Runtime state lives in OD_DATA_DIR (default:
                ''${XDG_STATE_HOME:-$HOME/.local/state}/open-design).

                Built from source at tag open-design-v${version}: daemon + web UI,
                with the workspace tree laid out the way deploy/Dockerfile does.
              '';
              homepage = "https://github.com/nexu-io/open-design";
              license = licenses.asl20;
              mainProgram = "od";
              platforms = systems;
              maintainers = [ ];
            };
          });
        });
    };
}
