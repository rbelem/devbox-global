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

      # Hash capture workflow:
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

          # Pure, small derivation: upstream source with the two NixOS PATH
          # fixes applied. The heavy Bazel build happens on first engine run.
          engineSource = pkgs.stdenv.mkDerivation {
            pname = "kitesurf-engine-source";
            inherit version src;

            phases = [ "unpackPhase" "patchPhase" "installPhase" ];

            unpackPhase = ''
              runHook preUnpack
              cp -aL $src/. .
              chmod -R u+w .
              runHook postUnpack
            '';

            patchPhase = ''
              runHook prePatch
              # std.bzl builds wasm32 std with a hardcoded /usr/bin:/bin PATH
              # and /usr/bin/perl. Use Nix tools; the temp dir is a placeholder
              # the launcher rewrites to its own writable cache on first run.
              substituteInPlace bazel/rust/std.bzl \
                --replace 'PATH=/usr/bin:/bin' 'PATH=${bazelPath}' \
                --replace '"PATH": "/usr/bin:/bin"' '"PATH": "${bazelPath}", "TMPDIR": "__KITESURF_TMPDIR__"' \
                --replace '/usr/bin/perl' '${pkgs.perl}/bin/perl' \
                --replace 'B=/tmp/kitesurf-wasm-std' 'B=$TMPDIR/kitesurf-wasm-std'
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

            installPhase = ''
              runHook preInstall
              mkdir -p "$out/share/kitesurf-engine"
              tar --exclude='./bazel-*' -cf - . | tar -C "$out/share/kitesurf-engine" -xf -
              runHook postInstall
            '';
          };

          # The engine is a Bazel/WASM Cloudflare Worker. Building it inside a
          # Nix derivation would need a fixed output hash, but wasm-bindgen
          # emits build-dependent symbol hashes, so the result is not stable.
          # Instead this package ships a launcher that builds once into a
          # writable cache dir on first start (needs network for Bazel's Rust
          # toolchain, crates and npm), then runs `wrangler dev` from there.
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
              CACHE="\$STATE/cache"
              mkdir -p "\$CACHE/tmp" "\$STATE/home"
              if [ ! -f "\$STATE/.built" ]; then
                echo "kitesurf-engine: first run: copying source and building with Bazel (this takes a while)" >&2
                if [ ! -f "\$STATE/.source" ]; then
                  cp -a "$out/share/kitesurf-engine/." "\$STATE/"
                  touch "\$STATE/.source"
                fi
                sed -i "s|__KITESURF_TMPDIR__|\$CACHE/tmp|g" "\$STATE/bazel/rust/std.bzl"
                mkdir -p "\$STATE/tools/bin"
                ln -sf "${pkgs.bazelisk}/bin/bazelisk" "\$STATE/tools/bin/bazel"
                export HOME="\$STATE/home"
                export TMPDIR="\$CACHE/tmp"
                export PATH="\$STATE/tools/bin:${bazelPath}:\$PATH"
                export SSL_CERT_FILE="${pkgs.cacert}/etc/ssl/certs/ca-bundle.crt"
                cd "\$STATE"
                bazel --output_base="\$CACHE/bazel-out" run \
                  --repo_contents_cache= \
                  --noincompatible_strict_action_env \
                  --repo_env=PATH="${bazelPath}" \
                  --action_env=PATH="${bazelPath}" \
                  --shell_executable="${pkgs.bash}/bin/bash" \
                  //packages/engine:dev_build
                touch "\$STATE/.built"
              fi
              cd "\$STATE"
              if [ ! -d node_modules ]; then
                echo "kitesurf-engine: installing pnpm deps" >&2
                export NPM_CONFIG_PREFIX="\$STATE/tools"
                "${pkgs.nodejs_22}/bin/npm" install -g pnpm@9.15.4 >/dev/null
                unset NPM_CONFIG_PREFIX
                export PATH="\$STATE/tools/bin:\$PATH"
                pnpm install --frozen-lockfile
              fi
              cd "\$STATE/packages/engine"
              export PATH="\$STATE/tools/bin:\$PATH"
              exec pnpm dev "\$@"
              EOF
              chmod +x "$out/bin/kitesurf-engine"
              runHook postInstall
            '';

            meta = with pkgs.lib; {
              description = "Local cloudflare/kitesurf CDP engine (built on first run)";
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
