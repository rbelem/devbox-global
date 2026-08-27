{
  description = "opencode v2 (opencode2) CLI built from source with our bun (baseline, VirtualBox-safe)";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    # Our bun package (devbox.d/bun, x64-baseline for VirtualBox compat).
    # Referenced via this repo's GitHub tree with `dir=` because relative
    # path inputs only resolve from git worktrees, not from devbox's plain
    # global dir. The lock pins a commit, so builds stay reproducible;
    # refresh with `nix flake lock --update-input opencode-bun` after
    # pushing bun changes to main.
    opencode-bun.url = "github:rbelem/devbox-global/main?dir=devbox.d/bun";
  };

  outputs = { self, nixpkgs, opencode-bun }:
    let
      supportedSystems = [ "x86_64-linux" ];
      forAllSystems = f: nixpkgs.lib.genAttrs supportedSystems (system: f nixpkgs.legacyPackages.${system});

      # Built from the repo's v2 branch (packages/cli → binary "opencode2",
      # published as @opencode-ai/cli next builds). Follows the same recipe
      # as devbox.d/opencode (nixpkgs' opencode package): fixed-output
      # node_modules via `bun install --filter … --ignore-scripts` +
      # canonicalize-node-modules, then a plain build derivation that
      # compiles with `bun build --compile`.
      #
      # No comparable tags — the repo's releases are the v1 line, so
      # update-flake must not compare against them (it would flag ↓ and
      # auto-"downgrade" to v1). The `# branch-tracking:` directive below
      # makes update-flake resolve "latest" to this branch, show ↑ (ahead),
      # and never auto-update. Bump manually:
      #   1. update rev (v2 HEAD) + srcHash (nix-prefetch-github)
      #   2. bump the version date (upstream next builds are 0.0.0-next-<n>;
      #      package.json's own 1.18.4 collides with the v1 version line)
      #   3. clear nodeModulesHash (fakeHash) → build → paste real hash
# branch-tracking: v2
      version = "0.0.0-next-20260827"; # v2 branch, next-channel naming
      rev = "0c77f6ed5b4276ea713ca0d5983da21c1981ada4";
      srcHash = "sha256-Cjm8K1DS67sBTDSjEEkiOvxKrcu8xTv6gd7FOsq4Aeg=";
      nodeModulesHash = "sha256-3k6lTkIttDQjrRL37OpDd3dTDrys6FwzQnbCZ1E4mXs=";

      # Workspace packages packages/cli depends on (deps + devDeps); the
      # fixed-output install is filtered to these to keep the hash small.
      cliDeps = [
        "cli" "client" "plugin" "schema" "server" "tui" "util"
        "script" "protocol"
      ];
      filterFlags = builtins.concatStringsSep " " (builtins.map (p: "--filter ./packages/${p}") cliDeps);
    in
    {
      packages = forAllSystems (pkgs:
        let
          system = pkgs.system;

          # From the devbox.d/bun flake (stable 1.4.0 x64-baseline release).
          # `bun build --compile` with target "bun-linux-x64" embeds the
          # running bun's OWN runtime — i.e. this baseline build, no AVX.
          ourBun = opencode-bun.packages.${system}.default;

          src = pkgs.fetchFromGitHub {
            owner = "anomalyco";
            repo = "opencode";
            inherit rev;
            hash = srcHash;
          };
        in
        rec {
          # Fixed-output sub-derivation (network allowed in sandbox):
          # `bun install` skips lifecycle scripts (no /usr/bin/env in the
          # sandbox; the natives the CLI needs — bun-pty, opentui,
          # parcel-watcher, tree-sitter — are prebuilt via optional deps)
          # and canonicalize-node-modules rewrites bun's absolute `.bun`
          # links to relative ones, so the output has no store references.
          node_modules = pkgs.stdenvNoCC.mkDerivation {
            pname = "opencode-v2-node-modules";
            # Constant version: node_modules content is package-version-
            # independent; a stable name keeps the store path stable across
            # package version bumps.
            version = "1";
            inherit src;

            nativeBuildInputs = [ ourBun ];

            dontConfigure = true;

            buildPhase = ''
              runHook preBuild
              export HOME=$TMPDIR
              export BUN_INSTALL_CACHE_DIR=$(mktemp -d)
              bun install \
                --cpu="x64" \
                --os="linux" \
                --filter '!./' \
                ${filterFlags} \
                --ignore-scripts \
                --no-progress
              bun --bun ./nix/scripts/canonicalize-node-modules.ts
              bun --bun ./nix/scripts/normalize-bun-binaries.ts
              runHook postBuild
            '';

            installPhase = ''
              runHook preInstall
              mkdir -p $out
              find . -type d -name node_modules -exec cp -R --parents {} $out \;
              runHook postInstall
            '';

            # Required else we get errors that our fixed-output derivation
            # references store paths.
            dontFixup = true;

            outputHashAlgo = "sha256";
            outputHashMode = "recursive";
            outputHash = nodeModulesHash;
          };

          opencode-v2 = pkgs.stdenvNoCC.mkDerivation (finalAttrs: {
            pname = "opencode2";
            inherit version src;
            inherit node_modules;

            nativeBuildInputs = [
              ourBun
              pkgs.nodejs # for patchShebangs node_modules
            ];

            postPatch = ''
              # Relax the bun version check to a warning (our canary may be
              # ahead of the pinned packageManager version).
              substituteInPlace packages/script/src/index.ts \
                --replace-fail 'throw new Error(`This script requires bun@''${expectedBunVersionRange}' \
                               'console.warn(`Warning: This script requires bun@''${expectedBunVersionRange}'

              # `bun build --compile` downloads the target runtime from npm
              # (@oven/bun-*), which has no canary 1.4.0 packages. Target
              # "bun-linux-x64" matches the running bun, so its OWN runtime
              # is embedded instead — i.e. our baseline canary, no AVX.
              sed -i 's|target: target.replace(binary, "bun") as Bun.Build.CompileTarget|target: "bun-linux-x64" as Bun.Build.CompileTarget|' \
                packages/cli/script/build.ts
            '';

            configurePhase = ''
              runHook preConfigure

              cp -R ${finalAttrs.node_modules}/. .
              patchShebangs node_modules
              patchShebangs packages/*/node_modules

              runHook postConfigure
            '';

            env.OPENCODE_DISABLE_MODELS_FETCH = true;
            env.OPENCODE_VERSION = finalAttrs.version;
            env.OPENCODE_CHANNEL = "next";

            buildPhase = ''
              runHook preBuild
              ulimit -n 10240 2>/dev/null || true

              cd ./packages/cli
              bun --bun ./script/build.ts \
                --target=opencode2-linux-x64-baseline \
                --skip-install --skip-web-ui

              runHook postBuild
            '';

            installPhase = ''
              runHook preInstall

              install -Dm755 dist/cli-linux-x64-baseline/bin/opencode2 $out/bin/opencode2

              runHook postInstall
            '';

            meta = with pkgs.lib; {
              description = "opencode v2 - AI coding agent TUI (built with our bun baseline)";
              homepage = "https://opencode.ai/v2/docs";
              license = licenses.mit;
              mainProgram = "opencode2";
              platforms = supportedSystems;
            };
          });

          default = opencode-v2;
        });

      apps = forAllSystems (pkgs: {
        opencode2 = {
          type = "app";
          program = "${self.packages.${pkgs.system}.opencode-v2}/bin/opencode2";
        };
        default = self.apps.${pkgs.system}.opencode2;
      });
    };
}
