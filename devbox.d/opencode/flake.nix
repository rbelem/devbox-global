{
  description = "OpenCode 1.18.3 built as a plain bundle (path A) using bun from devbox.d/bun";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

    # Input-based composition: opencode consumes the bun produced by the
    # sibling devbox.d/bun flake (canary, latest main). The build skips
    # `bun build --compile` entirely (which segfaults on every bun ≥
    # 1.3.14) and ships a plain JS bundle wrapped in a tiny shell stub
    # that invokes the canary bun runtime against it.
    bun.url = "path:../bun";
  };

  outputs = { self, nixpkgs, bun }:
    let
      systems = [ "x86_64-linux" ];
      forAllSystems = nixpkgs.lib.genAttrs systems;

      version = "1.18.3";

      srcHash = "sha256-Wdkzms59oHw3M/Em2RH7BPhZME8AtLmtNFSnsUxO1V4=";
      nodeModulesHash = "sha256-1NUtprMH8GnSUqQ+mHQSC+JLU7lwzHe6XXYHe129WmE=";
    in
    {
      packages = forAllSystems (system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
          localBun = bun.packages.${system}.default;

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
            #      layout bun's bundler settles on.
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

            # buildPhase already runs `bun --bun ./script/build.ts --single`
            # from ./packages/opencode, which (with our patch) now produces
            # a directory bundle instead of a single binary.

            # installPhase: copy bundle + node_modules into libexec, ship
            # a wrapper at $out/bin/opencode that execs canary bun on the
            # bundle. Same structure as nixpkgs's opencode but no binary.
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
              # Trade-off: ~5x larger install because dedup is lost.
              cp -RL . $out/libexec/opencode/

              # The wrapper — invokes canary bun on the bundle. Uses
              # `<<'WRAPPER'` (single-quoted heredoc) so `$p`, `$@`, etc.
              # stay literal for the shell, and `''$` escapes so nix
              # doesn't interpolate them. We derive our own $out at
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
            # check hook (which would segfault trying to run opencode) and
            # the install-completion step (which calls `opencode completion`).
            doInstallCheck = false;
            nativeInstallCheckInputs = [ ];
          });
        }
      );
    };
}
