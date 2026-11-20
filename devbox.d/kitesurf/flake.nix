{
  description = "kitesurf CLI + local engine for Cloudflare's CDP browser engine";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs =
    { self, nixpkgs }:
    let
      # x86_64-linux only until someone verifies aarch64-linux or darwin.
      systems = [ "x86_64-linux" ];
      forAllSystems = nixpkgs.lib.genAttrs systems;

      # Release line: upstream tags plain calver (2026.11.9), no prefix and no
      # GitHub releases; the tags are the only source of versions.
      version = "2026.11.9";

      # Hash capture workflow for the CLI source:
      #   1. set srcHash to pkgs.lib.fakeHash
      #   2. nix build "path:devbox.d/kitesurf#default"
      #   3. paste the sha256-... value from the error message
      srcHash = "sha256-GIJuGlLqycvWp8bMmNX/QtE9JVpmwSaNDmY0hyLJvJY=";
    in
    {
      packages = forAllSystems (
        system:
        let
          pkgs = nixpkgs.legacyPackages.${system};

          src = pkgs.fetchFromGitHub {
            owner = "cloudflare";
            repo = "kitesurf";
            rev = version;
            hash = srcHash;
          };

          # Tool paths Bazel actions need on PATH. Upstream hardcodes
          # /usr/bin:/bin in its WASM std builder and npm lifecycle hooks;
          # both are absent on NixOS, so we substitute this PATH into the
          # source below. These are all Nix store paths, so the patch is pure.
          bazelPath = pkgs.lib.concatStringsSep ":" (
            map (p: "${p}/bin") [
              pkgs.bash
              pkgs.coreutils
              pkgs.gnused
              pkgs.gnugrep
              pkgs.gnutar
              pkgs.util-linux
              pkgs.perl
              pkgs.gcc
            ]
          ) + ":/usr/bin:/bin";

          # The engine is a Bazel/WASM Cloudflare Worker. Its build downloads
          # Rust nightly, crates and npm packages, so this derivation needs
          # network at build time (devbox global sets NIX_CONFIG sandbox=false
          # for that reason). Everything is built and installed here, so the
          # service can start immediately with no compilation on first run.
          #
          # A fixed-output derivation was tried and rejected: wasm-bindgen is
          # not reproducible (two identical builds emitted 5270 vs 5269 shims),
          # so no stable output hash can be pinned. A normal derivation has no
          # such requirement.
          engineSource = pkgs.stdenv.mkDerivation {
            pname = "kitesurf-engine-source";
            inherit version src;

            nativeBuildInputs = with pkgs; [
              bash
              coreutils
              gnused
              gnugrep
              gnutar
              util-linux
              perl
              gcc
              nodejs_22
              bazelisk
              python3
            ];

            phases = [ "unpackPhase" "patchPhase" "buildPhase" "installPhase" ];

            unpackPhase = ''
              runHook preUnpack
              cp -aL $src/. .
              chmod -R u+w .
              runHook postUnpack
            '';

            patchPhase = ''
              runHook prePatch
              substituteInPlace bazel/rust/std.bzl \
                --replace 'PATH=/usr/bin:/bin' 'PATH=${bazelPath}' \
                --replace '"PATH": "/usr/bin:/bin"' '"PATH": "${bazelPath}", "TMPDIR": "$TMPDIR"' \
                --replace '/usr/bin/perl' '${pkgs.perl}/bin/perl' \
                --replace 'B=/tmp/kitesurf-wasm-std' 'B=$TMPDIR/kitesurf-wasm-std'
              # repos.bzl otherwise probes /usr/bin:/bin for GNU tar; NixOS
              # has no tar there, so put the store path first explicitly.
              substituteInPlace bazel/rust/repos.bzl \
                --replace 'for candidate in ["/opt/homebrew/bin/gtar", "/usr/local/bin/gtar"]:' \
                  'for candidate in ["${pkgs.gnutar}/bin/tar", "/opt/homebrew/bin/gtar", "/usr/local/bin/gtar"]:'
              # rules_js npm lifecycle hooks (esbuild postinstall) also run
              # with an empty env; give them the same PATH and default shell
              # env so they can find uname/sh/node.
              substituteInPlace MODULE.bazel \
                --replace '    pnpm_lock = "//:pnpm-lock.yaml",' \
                  '    pnpm_lock = "//:pnpm-lock.yaml",
    lifecycle_hooks_use_default_shell_env = {"*": "1"},
    lifecycle_hooks_envs = {"*": ["PATH=${bazelPath}"]},'
              runHook postPatch
            '';

            buildPhase = ''
              runHook preBuild
              export HOME=$TMPDIR
              mkdir -p "$TMPDIR/tools/bin"
              ln -s "$(command -v bazelisk)" "$TMPDIR/tools/bin/bazel"
              export PATH="$TMPDIR/tools/bin:$PATH"
              bazel --output_base="$TMPDIR/bazel-out" run \
                --repo_contents_cache= \
                --noincompatible_strict_action_env \
                --repo_env=PATH="${bazelPath}" \
                --action_env=PATH="${bazelPath}" \
                --shell_executable="$(command -v bash)" \
                //packages/engine:dev_build

              # Install pnpm + all workspace node_modules into the output so
              # the service needs no network and no npm install at start.
              export SSL_CERT_FILE="${pkgs.cacert}/etc/ssl/certs/ca-bundle.crt"
              export NODE_EXTRA_CA_CERTS="$SSL_CERT_FILE"
              export NPM_CONFIG_PREFIX="$PWD/tools"
              ${pkgs.nodejs_22}/bin/npm install -g pnpm@9.15.4 >/dev/null
              unset NPM_CONFIG_PREFIX
              export PATH="$PWD/tools/bin:$PATH"
              pnpm install --frozen-lockfile
              runHook postBuild
            '';

            installPhase = ''
              runHook preInstall
              mkdir -p "$out/share/kitesurf-engine"
              tar --exclude='./bazel-*' -cf - . | tar -C "$out/share/kitesurf-engine" -xf -
              runHook postInstall
            '';
          };

          engine = pkgs.stdenv.mkDerivation {
            pname = "kitesurf-engine";
            inherit version;
            src = engineSource;

            dontUnpack = true;
            installPhase = ''
              runHook preInstall
              mkdir -p "$out/bin" "$out/share"
              cp -a "$src/share/kitesurf-engine" "$out/share/"
              cat > "$out/bin/kitesurf-engine" <<EOF
              #!/bin/sh
              set -eu
              STATE="\''${XDG_CACHE_HOME:-\$HOME/.cache}/kitesurf-engine-${version}"
              if [ ! -f "\$STATE/.source" ]; then
                echo "kitesurf-engine: preparing runtime cache" >&2
                chmod -R u+w "\$STATE" 2>/dev/null || true
                rm -rf "\$STATE"
                mkdir -p "\$STATE"
                cp -a "$out/share/kitesurf-engine/." "\$STATE/"
                chmod -R u+w "\$STATE"
                touch "\$STATE/.source"
              fi
              cd "\$STATE/packages/engine"
              export PATH="\$STATE/tools/bin:\$PATH"
              exec pnpm dev "\$@"
              EOF
              chmod +x "$out/bin/kitesurf-engine"
              runHook postInstall
            '';

            meta = with pkgs.lib; {
              description = "Local cloudflare/kitesurf CDP engine (prebuilt)";
              homepage = "https://github.com/cloudflare/kitesurf";
              license = licenses.asl20;
              mainProgram = "kitesurf-engine";
            };
          };
        in
        {
          default = pkgs.rustPlatform.buildRustPackage {
            pname = "kitesurf";
            inherit version src;

            cargoLock.lockFile = "${src}/packages/kitesurf-cli/Cargo.lock";
            cargoRoot = "packages/kitesurf-cli";
            buildAndTestSubdir = "packages/kitesurf-cli";

            # aws-lc-sys (via rustls) must build from source: nixpkgs' default
            # system-libs mode points it at a system AWS-LC we do not ship.
            dontCargoUseSystemLibs = true;
            nativeBuildInputs = [ pkgs.cmake ];

            # Upstream tests are gated on Bazel: integration tests read the
            # Bazel-built scene_host.wasm, which is not in git. Skip exactly
            # those; keep the rest of the suite running in the sandbox.
            checkFlags = [
              "--skip"
              "wasm::tests"
              "--skip"
              "playback::tests::partial_replay"
              "--skip"
              "playback::tests::retained_replay_reports_corrupt_full_scenes"
              "--skip"
              "font_cache::tests::duplicate_hashes_for_one_font_path_fetch_and_resolve_once"
            ];

            meta = with pkgs.lib; {
              description = "Terminal browser client for Cloudflare Kitesurf";
              homepage = "https://github.com/cloudflare/kitesurf";
              license = licenses.asl20;
              mainProgram = "kitesurf";
            };
          };

          kitesurf-engine = engine;
        }
      );

      apps = forAllSystems (
        system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
        in
        {
          default = {
            type = "app";
            program = "${self.packages.${system}.default}/bin/kitesurf";
          };
          kitesurf-engine = {
            type = "app";
            program = "${self.packages.${system}.kitesurf-engine}/bin/kitesurf-engine";
          };
        }
      );
    };
}
