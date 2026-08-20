{
  description = "dsh - DeepSeek Harness: agent harness with a Cordis plugin architecture (everything is a plugin)";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { self, nixpkgs }:
    let
      # landlock-run (the sandbox) is a Linux-only static-musl C addon; the
      # upstream build has no cross toolchain, so non-Linux is unsupported.
      systems = [ "x86_64-linux" "aarch64-linux" ];
      forAllSystems = nixpkgs.lib.genAttrs systems;

      # No upstream tags/releases: pin to a master commit. update-flake
      # shows this as "??" and never auto-updates it — bump manually by
      # updating rev + both hashes below.
      version = "0.1.0-rc.5"; # mirrors root package.json version
      rev = "47f943859bef60e4160492346772ded9b24f765a"; # master 2026-08-13

      # Hash capture workflow:
      #   1. set srcHash / pnpmDepsHash to pkgs.lib.fakeHash
      #   2. nix build "path:devbox.d/deepseek-harness#default"
      #   3. paste the sha256-... values from the error messages
      srcHash = "sha256-ZPGCNoPXVjP76Tm/tFPDX2X95cd83M4iHLmVP5dR+Ps=";
      pnpmDepsHash = "sha256-aySHq0ywTMM5q7YuGHZrV3yQE3bwppgGfWH3wRnHCXk=";
    in
    {
      packages = forAllSystems (system:
        let
          pkgs = nixpkgs.legacyPackages.${system};

          src = pkgs.fetchFromGitHub {
            owner = "deepseek-ai";
            repo = "deepseek-harness";
            rev = rev;
            hash = srcHash;
          };
        in
        {
          default = pkgs.stdenv.mkDerivation (finalAttrs: {
            pname = "deepseek-harness";
            inherit version src;

            pnpmDeps = pkgs.fetchPnpmDeps {
              inherit (finalAttrs) pname version src;
              # pnpm 11: the repo pins pnpm@11.7.0 and relies on pnpm 11's
              # allowBuilds/strictDepBuilds config in pnpm-workspace.yaml to
              # approve native builds (node-pty, koffi, esbuild, lefthook).
              # pnpm_10 would ignore allowBuilds and silently skip them.
              pnpm = pkgs.pnpm_11;
              fetcherVersion = 4;
              hash = pnpmDepsHash;
            };

            nodejs = pkgs.nodejs_22; # engines ^22.19.0 || >=24.0.0
            pnpm = pkgs.pnpm_11;

            nativeBuildInputs = [
              pkgs.nodejs_22
              pkgs.pnpm_11
              pkgs.pnpmConfigHook
              pkgs.makeWrapper
              pkgs.python3 # node-gyp (node-pty)
              pkgs.gnumake
              pkgs.gcc # node-gyp + koffi source-compile fallback
              pkgs.git
            ];

            buildInputs = [ finalAttrs.pnpmDeps ];

            # lefthook's postinstall downloads a binary and is allowlisted in
            # pnpm-workspace.yaml; CI=1 turns it into a no-op (it only installs
            # git hooks, which a read-only Nix store cannot use anyway).
            env.CI = "1";

            # The root postinstall (install-lefthook.mjs) imports the 'lefthook'
            # devDependency — it breaks the production reinstall in installPhase
            # (dev deps pruned). Git hooks are useless in a store; drop it.
            patchPhase = ''
              runHook prePatch
              # Drop the root postinstall by rewriting package.json as JSON
              # (string substitutions can't safely express the empty string).
              python3 - <<'PYEOF'
            import json
            p = json.load(open("package.json"))
            p["scripts"].pop("postinstall", None)
            json.dump(p, open("package.json", "w"), indent=2)
            PYEOF
              runHook postPatch
            '';

            buildPhase = ''
              runHook preBuild

              # landlock-run: static musl C binary (git-ignored upstream,
              # built per-host). nixpkgs has no musl-gcc — shim it with the
              # raw musl cross gcc + explicit libc/linux-header paths (the
              # cc-wrapper's flags are lost when invoked via symlink).
              MUSL_GCC_BIN=$(ls ${pkgs.pkgsCross.musl64.buildPackages.gcc.cc}/bin | grep -m1 'gcc$')
              mkdir -p $NIX_BUILD_TOP/musl-bin
              cat > $NIX_BUILD_TOP/musl-bin/musl-gcc <<EOF
              #!/bin/sh
              export PATH=${pkgs.pkgsCross.musl64.buildPackages.binutils}/bin:\$PATH
              exec ${pkgs.pkgsCross.musl64.buildPackages.gcc.cc}/bin/$MUSL_GCC_BIN \\
                -B${pkgs.pkgsCross.musl64.buildPackages.musl}/lib \\
                -I${pkgs.pkgsCross.musl64.buildPackages.linuxHeaders}/include \\
                -I${pkgs.pkgsCross.musl64.buildPackages.musl}/include \\
                -L${pkgs.pkgsCross.musl64.buildPackages.musl}/lib \\
                "\$@"
              EOF
              chmod +x $NIX_BUILD_TOP/musl-bin/musl-gcc
              export PATH=$NIX_BUILD_TOP/musl-bin:$PATH
              (cd native/landlock-run && pnpm run build:native)

              # node-pty's install script is `node scripts/prebuild.js || node-gyp
              # rebuild`; prebuild.js exits 0 (no network) without building, so
              # pty.node never gets compiled. Force the node-gyp rebuild with
              # npm's bundled node-gyp (node headers ship with nodejs_22).
              NPTY_DIR=$(find node_modules/.pnpm -maxdepth 1 -type d -name 'node-pty@*' | head -1)/node_modules/node-pty
              sed -i 's#node scripts/prebuild.js || node-gyp rebuild#node-gyp rebuild#' "$NPTY_DIR/package.json"
              (cd "$NPTY_DIR" && node ${finalAttrs.nodejs}/lib/node_modules/npm/node_modules/node-gyp/bin/node-gyp.js rebuild)

              # Full build: tsc (host+client) + tsdown bundles + vite web frontend.
              pnpm run build

              runHook postBuild
            '';

            # The CLI resolves all @deepseek-ai/* workspace packages through
            # relative symlinks into the workspace source dirs (built lib/ and
            # vite dist assets live there), and the landlock platform binary
            # sits in native/landlock-run/packages/*/bin — so ship the whole
            # tree. cp -a keeps pnpm's relative symlinks intact.
            #
            # No production prune: packages/boot/app-boot's built lib imports
            # @deepseek-ai/cordis, which upstream declares only as a devDep
            # (phantom dep). `pnpm install --prod` prunes it — and leaves the
            # workspace root's node_modules empty (the root package declares
            # no prod deps of its own) — breaking runtime module resolution.
            #
            # `dsh plugin` manages a profile's plugins by forwarding to pnpm
            # in the profile directory, and MCP servers spawn npx — node/pnpm/
            # git are on the wrapper's PATH (plugin readiness).
            installPhase = ''
              runHook preInstall

              mkdir -p $out/lib
              cp -a . $out/lib/dsh
              test -f $out/lib/dsh/apps/cli/lib/bin.js || {
                echo "apps/cli/lib/bin.js missing — did tsc emit it?" >&2
                exit 1
              }

              # npm-flat-style hoisting. Upstream's published npm install puts
              # every @deepseek-ai/* package at the node_modules root, so the
              # plugin loader (vendor/loader, which dynamic-imports plugin
              # names by walking up from its own location) resolves them.
              # pnpm's per-package layout links workspace deps into each
              # dependent's node_modules instead, leaving the root sparse —
              # the boot fails with ERR_MODULE_NOT_FOUND. Mirror the npm
              # layout: symlink every workspace package into the root
              # node_modules (additive; harmless for per-package resolution).
              python3 - <<PYEOF
            import json, os
            root = "$out/lib/dsh"
            for sub in ("packages", "vendor", "native/landlock-run/packages"):
                base = os.path.join(root, sub)
                for dirpath, dirnames, filenames in os.walk(base):
                    if "package.json" not in filenames:
                        continue
                    name = json.load(open(os.path.join(dirpath, "package.json"))).get("name")
                    if not name:
                        continue
                    link = os.path.join(root, "node_modules", name)
                    if os.path.lexists(link):
                        continue
                    os.makedirs(os.path.dirname(link), exist_ok=True)
                    os.symlink(os.path.relpath(dirpath, os.path.dirname(link)), link)
            PYEOF

              # Remove symlinks to unresolvable optional platform binary deps
              # before fixupPhase's noBrokenSymlinks check (they are runtime-
              # optional — the harness spawns them lazily per provider). pnpm
              # links @openai/codex-linux-x64 even though that package has NO
              # versions on the npm registry (upstream declares it but never
              # publishes it), and under offline fetch it also skips the glibc
              # @anthropic-ai/claude-agent-sdk-linux-x64 while pulling the
              # musl/arm64 siblings, so both land as dangling links whose
              # targets were never extracted. Match them by -name (each is the
              # only symlink of that name in the tree) instead of an -L deref
              # walk, which crawls this ~100k-link virtual store for minutes.
              # Any other dangling link still trips noBrokenSymlinks loudly.
              find "$out/lib/dsh/node_modules" -type l \
                \( -name 'codex-linux-x64' -o -name 'claude-agent-sdk-linux-x64' \) \
                -print -delete | sed 's#^#  removed platform dep link: #'

              mkdir -p $out/bin
              makeWrapper ${finalAttrs.nodejs}/bin/node \
                $out/bin/dsh \
                --add-flags "--expose-internals $out/lib/dsh/apps/cli/lib/bin.js" \
                --prefix PATH : ${finalAttrs.nodejs}/bin:${finalAttrs.pnpm}/bin:${pkgs.git}/bin

              runHook postInstall
            '';

            meta = with pkgs.lib; {
              description = "DeepSeek Harness - agent harness with a Cordis plugin architecture";
              longDescription = ''
                dsh is DeepSeek's agent harness. Everything is a Cordis
                plugin: model adapters, tools, shells, persistence. Profiles
                under $DSH_HOME/profiles/<name>/ compose plugin bundles;
                `dsh plugin --profile <name>` manages plugins by forwarding
                to pnpm in the profile directory. Web UI: `dsh web`
                (http://127.0.0.1:3080). The web/headless profiles
                auto-initialize from shipped templates.
              '';
              homepage = "https://github.com/deepseek-ai/deepseek-harness";
              license = licenses.mit;
              mainProgram = "dsh";
              platforms = systems;
              maintainers = [ ];
            };
          });
        });

      apps = forAllSystems (pkgs: {
        dsh = {
          type = "app";
          program = "${self.packages.${pkgs.system}.default}/bin/dsh";
        };
        default = self.apps.${pkgs.system}.dsh;
      });
    };
}
