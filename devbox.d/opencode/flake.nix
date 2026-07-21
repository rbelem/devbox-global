{
  description = "OpenCode 1.18.3 built as a plain bundle (path A) using canary bun runtime";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs = { self, nixpkgs }:
    let
      systems = [ "x86_64-linux" ];
      forAllSystems = nixpkgs.lib.genAttrs systems;

      version = "1.18.4";

      # Canary bun 1.4.0 (x64 baseline). Inlined here (rather than via
      # `inputs.bun.url = "path:../bun"`) because devbox copies this flake
      # to `~/.local/share/devbox/global/default/devbox.d/opencode/` at
      # install time, and nix flake input resolution of `path:../bun` from
      # a stored copy of the opencode source collapses to `/nix/store/bun/`
      # (no hash, nix rejects it as not a valid store path). Self-contained
      # means opencode works identically in the repo and in devbox's global
      # copy. The same canary URL is used by `devbox.d/bun/flake.nix` for
      # general-purpose `result/bin/bun`; bump both hashes together when
      # rolling to a new canary build.
      bunCanarySha256 = "sha256-6Ptf1gu3z+CgYmqeTZL+nWEUWnSZ7SWtI3NnhE3n6QU=";

      # Hash capture workflow for srcHash / nodeModulesHash:
      #   1. uncomment fakeHash lines and comment real hashes
      #   2. devbox global update
      #   3. paste sha256-... values back
      srcHash = "sha256-tGMO5JktINO8kXAHFQftn+JCrzwvpmNipTa8V0aIfNI=";
      nodeModulesHash = "sha256-7WVCgEVno9J6i+BL6F2H7RU37eunRs/Ljxy+/AB1DP0=";
    in
    {
      packages = forAllSystems (system:
        let
          pkgs = nixpkgs.legacyPackages.${system};

          # Inline canary bun fetch — same URL as devbox.d/bun/flake.nix,
          # but pulled directly so opencode doesn't need cross-flake
          # inputs (which break in devbox's stored-copy install path).
          localBun = pkgs.stdenvNoCC.mkDerivation {
            pname = "bun";
            version = "1.4.0-canary";

            src = pkgs.fetchurl {
              url = "https://github.com/oven-sh/bun/releases/download/canary/bun-linux-x64-baseline.zip";
              sha256 = bunCanarySha256;
            };

            nativeBuildInputs = [
              pkgs.unzip
              pkgs.makeWrapper
            ] ++ pkgs.lib.optionals pkgs.stdenv.isLinux [
              pkgs.autoPatchelfHook
            ];

            buildInputs = pkgs.lib.optionals pkgs.stdenv.isLinux [
              pkgs.openssl
              pkgs.zlib
              pkgs.gcc.cc.lib
            ];

            dontConfigure = true;
            dontBuild = true;

            # stdenv cd's into the extracted top-level dir on unpack.
            installPhase = ''
              runHook preInstall
              install -Dm 755 bun $out/bin/bun
              ln -s $out/bin/bun $out/bin/bunx
              runHook postInstall
            '';
          };

          src = pkgs.fetchFromGitHub {
            owner = "anomalyco";
            repo = "opencode";
            rev = "v${version}";
            hash = srcHash;
          };
        in
        {
          default = (pkgs.opencode.override { bun = localBun; }).overrideAttrs (oldAttrs: {
            inherit version src;

            # postPatch uses python3 (heredoc) to rewrite build.ts.
            nativeBuildInputs = (oldAttrs.nativeBuildInputs or []) ++ [
              pkgs.python3
            ];

            patches = (oldAttrs.patches or []) ++ [
              ./fix-deepseek-reasoning-content.patch
            ];

            # PATH A — skip `bun build --compile`, ship a plain bundle.
            # Patch opencode's build.ts to:
            #   1. Replace the `compile: { ... }` block with `outdir:` +
            #      `target: "bun"` so Bun.build produces a directory of
            #      JS chunks (not a single binary) and allows Bun builtins.
            #   2. Replace the smoke test with a debug `find` + glob step
            #      that locates the entrypoint the bundler produced, then
            #      runs it under canary bun. This handles whatever output
            #      layout bun's bundler settles on without guessing.
            postPatch = ''
              python3 <<'PYEOF'
              import re, pathlib
              p = pathlib.Path("packages/opencode/script/build.ts")
              src = p.read_text()

              # 1. Drop the compile block; replace with outdir + target: bun.
              compile_pat = re.compile(
                r"    compile:\s*\{\s*"
                r"autoloadBunfig:\s*false,\s*"
                r"autoloadDotenv:\s*false,\s*"
                r"autoloadTsconfig:\s*true,\s*"
                r"autoloadPackageJson:\s*true,\s*"
                r"target:\s*name\.replace\(pkg\.name,\s*\"bun\"\)\s*as\s*any,\s*"
                r"outfile:\s*`dist/\$\{name\}/bin/opencode`,\s*"
                r"execArgv:\s*\[`--user-agent=opencode/\$\{Script\.version\}`,\s*\"--use-system-ca\",\s*\"--\"\],\s*"
                r"windows:\s*\{\},\s*"
                r"\},\s*"
              )
              new_src, n = compile_pat.subn(
                "    outdir: `dist/''${name}/bundle`,\n    target: \"bun\",",
                src
              )
              assert n == 1, f"compile-block patch matched {n} times"

              # 2. Smoke test: find any index.js in the bundle dir, run it
              #    under canary bun. Lets us adapt to whatever output layout
              #    bun's bundler settles on without guessing.
              smoke_pat = re.compile(
                r"(\s+)const binaryPath = `dist/\$\{name\}/bin/opencode`\s*"
                r"console\.log\(`Running smoke test: \$\{binaryPath\} --version`\)\s*"
                r"try \{\s*"
                r"const versionOutput = await \$`\$\{binaryPath\} --version`\.text\(\)\s*"
                r"console\.log\(`Smoke test passed: \$\{versionOutput\.trim\(\)\}`\)\s*"
                r"\} catch \(e\) \{\s*"
                r"console\.error\(`Smoke test failed for \$\{name\}:`, e\)\s*"
                r"process\.exit\(1\)\s*"
                r"\}",
                re.MULTILINE,
              )
              smoke_repl = (
                "\\1const bundleDir = `dist/''${name}/bundle`\n"
                "\\1const findOut = await $`find ''${bundleDir} -type f 2>/dev/null | sort`.text()\n"
                "\\1console.log(`DEBUG: bundleDir=''${bundleDir} contains:\\n''${findOut}`)\n"
                "\\1const entries = (await Array.fromAsync(new Bun.Glob('**/index.js').scan({ cwd: bundleDir })))\n"
                "\\1if (entries.length === 0) {\n"
                "\\1  console.error(`Smoke test failed: no index.js found in ''${bundleDir}`)\n"
                "\\1  process.exit(1)\n"
                "\\1}\n"
                "\\1const bundlePath = `''${bundleDir}/''${entries[0]}`\n"
                "\\1console.log(`Running smoke test (canary bun): bun ''${bundlePath} --version`)\n"
                "\\1try {\n"
                "\\1  const versionOutput = await $`bun ''${bundlePath} --version`.text()\n"
                "\\1  console.log(`Smoke test passed: ''${versionOutput.trim()}`)\n"
                "\\1} catch (e) {\n"
                "\\1  console.error(`Smoke test failed for ''${name}:`, e)\n"
                "\\1  process.exit(1)\n"
                "\\1}"
              )
              new_src, n2 = smoke_pat.subn(smoke_repl, new_src)
              assert n2 == 1, f"smoke-test patch matched {n2} times"

              p.write_text(new_src)
              print(f"build.ts patched: compile={n}, smoke={n2}")
              PYEOF
            '';

            installPhase = ''
              runHook preInstall

              mkdir -p $out/libexec/opencode $out/bin

              # cwd at installPhase is inherited from buildPhase's
              # `cd ./packages/opencode`. Copy the workspace contents
              # (incl. dist/, node_modules/, package.json) to libexec so
              # the wrapper can find the bundle and node_modules.
              # `cp -RL` (recursive + follow symlinks) is required because
              # bun's flat node_modules layout uses symlinks
              # (node_modules/<pkg> -> .bun/<pkg>@ver>/node_modules/<pkg>)
              # that point to source-relative paths and break under a
              # plain `cp -R` (noBrokenSymlinks: 124 dangling symlinks).
              cp -RL . $out/libexec/opencode/

              # The wrapper — invokes canary bun on the bundle. Uses
              # `<<'WRAPPER'` (single-quoted heredoc) so `$p`, `$@`, etc.
              # stay literal for the shell. We derive our own $out at
              # runtime via readlink (since `$out` would otherwise be
              # literal in this single-quoted heredoc and empty when the
              # script runs).
              cat > $out/bin/opencode <<'WRAPPER'
              #!${pkgs.runtimeShell}
              set -e
              script_path="$(readlink -f "$0")"
              bin_dir="$(dirname "$script_path")"
              out="$(cd "$bin_dir/.." && pwd)"
              for p in \
                "$out/libexec/opencode/dist/opencode-linux-x64/bundle/src/index.js" \
                "$out/libexec/opencode/dist/opencode-linux-x64/bundle/index.js" \
                ; do
                if [ -f "$p" ]; then
                  exec '${localBun}/bin/bun' \
                    --user-agent=opencode/${version} \
                    --use-system-ca \
                    "$p" "$@"
                fi
              done
              echo "opencode bundle not found in expected locations" >&2
              ls -la "$out/libexec/opencode/dist/opencode-linux-x64/" >&2 || true
              exit 1
              WRAPPER
              chmod +x $out/bin/opencode

              wrapProgram $out/bin/opencode \
                --prefix PATH : ${pkgs.lib.makeBinPath [ pkgs.ripgrep ]} \
                --set OPENCODE_DISABLE_AUTOUPDATE true

              # config files (generated by schema.ts at cwd = packages/opencode/)
              install -Dm644 config.json $out/share/opencode/config.json
              install -Dm644 tui.json $out/share/opencode/tui.json

              runHook postInstall
            '';

            # installShellCompletion runs `opencode completion` which
            # invokes our wrapper; skip it (regenerate manually if needed).
            postInstall = "";

            # Path A doesn't produce a compiled binary — skip the version
            # check hook (which would segfault trying to run opencode).
            doInstallCheck = false;
            nativeInstallCheckInputs = [ ];
          });
        }
      );
    };
}
