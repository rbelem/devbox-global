{
  description = "OpenCode v2 CLI built from source with our bun (baseline, VirtualBox-safe)";

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

      # The v2 line (v2.0.x tags) is the released OpenCode. This flake is
      # THE opencode package now (the old v1 flake + its deepseek patch
      # were dropped 2026-10-13 when v2 left next-channel). Same recipe as
      # before: fixed-output node_modules via `bun install --filter …
      # --ignore-scripts` + canonicalize-node-modules, then a plain build
      # derivation that compiles with `bun build --compile`.
      #
      # update-flake caveat: upstream `releases/latest` still points at
      # the v1 line (v1.19.0), so the status column shows ↑ (ahead) —
      # that is expected, not a downgrade offer. Bump by checking tags:
      #   gh api 'repos/anomalyco/opencode/tags?per_page=100' --jq '.[].name' | grep '^v2'
      #   1. update version + rev (v2.0.x tag) + srcHash (fakeHash → build)
      #   2. clear nodeModulesHash (fakeHash) → build → paste real hash
      version = "2.0.27";
      rev = "v2.0.27";
      srcHash = "sha256-C+MOdj8CPcP6cLWJl/KBg8/oR/XVOkn0+d7/54YKuU4=";
      nodeModulesHash = "sha256-waHr/8n5M/XIxWfhHUhBeMG0Q4b1yFRGcE+BRerj5tk=";

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
            pname = "opencode-node-modules";
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

          opencode = pkgs.stdenvNoCC.mkDerivation (finalAttrs: {
            pname = "opencode";
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
                --target=opencode-linux-x64-baseline \
                --skip-install --skip-web-ui

              runHook postBuild
            '';

            installPhase = ''
              runHook preInstall

              install -Dm755 dist/cli-linux-x64-baseline/bin/opencode $out/bin/opencode

              runHook postInstall
            '';

            meta = with pkgs.lib; {
              description = "OpenCode v2 - AI coding agent TUI (built with our bun baseline)";
              homepage = "https://opencode.ai/v2/docs";
              license = licenses.mit;
              mainProgram = "opencode";
              platforms = supportedSystems;
            };
          });

          default = opencode;
        });

      apps = forAllSystems (pkgs: {
        opencode = {
          type = "app";
          program = "${self.packages.${pkgs.system}.opencode}/bin/opencode";
        };
        default = self.apps.${pkgs.system}.opencode;
      });
    };
}
