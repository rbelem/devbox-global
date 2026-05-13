{
  description = "get-shit-done - AI meta-prompting and spec-driven development system";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs = { self, nixpkgs }:
    let
      systems = [ "x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin" ];
      forAllSystems = nixpkgs.lib.genAttrs systems;
      version = "1.41.2";
    in
    {
      packages = forAllSystems (system:
        let
          pkgs = nixpkgs.legacyPackages.${system};

          src = pkgs.fetchFromGitHub {
            owner = "gsd-build";
            repo = "get-shit-done";
            rev = "v${version}";
            hash = "sha256-kTUHeSBm40XKbGCpmN/p776UgvtvwGF2aWu+2iSIH44=";
          };

          # Pre-fetch root npm dependencies (from root package-lock.json)
          rootNpmDeps = pkgs.fetchNpmDeps {
            name = "root-npm-deps";
            inherit src;
            sourceRoot = src.name;
            hash = "sha256-2+/kD09Jw2ZzYHvu6xiVkXOPmlep7Y3pZrVdltNyCvc=";
          };

          # Pre-fetch SDK npm dependencies (from sdk/package-lock.json)
          sdkNpmDeps = pkgs.fetchNpmDeps {
            name = "sdk-npm-deps";
            inherit src;
            sourceRoot = "${src.name}/sdk";
            hash = "sha256-9OYqmoexNMDTHgA2eMeKL6o2iROfVo35DFErOW9tKps=";
          };

          # Combine npm caches from root and SDK into a single npm cache input.
          # buildNpmPackage's npmConfigHook expects the npmDeps to contain
          # a _cacache/ dir (npm cache format) and a package-lock.json
          # for consistency validation.
          combinedNpmDeps = pkgs.runCommand "gsd-combined-npm-deps" { } ''
            # Merge two npm _cacache dirs into one (content-addressed, no conflicts).
            # Store paths have 0555 perms; make writable before merging second.
            mkdir -p "$out/_cacache"
            cp -r ${rootNpmDeps}/_cacache/. "$out/_cacache/"
            chmod -R u+w "$out/_cacache/"
            cp -r ${sdkNpmDeps}/_cacache/. "$out/_cacache/"
            cp ${rootNpmDeps}/package-lock.json "$out"/
          '';
        in
        rec {
          get-shit-done = pkgs.buildNpmPackage rec {
            pname = "get-shit-done-cc";
            inherit version src;

            npmDeps = combinedNpmDeps;
            nodejs = pkgs.nodejs_22;

            # Root package has no "build" script — build SDK + hooks in preBuild
            dontNpmBuild = true;

            # Keep dev deps during build (SDK needs typescript etc.)
            dontNpmPrune = true;

            preBuild = ''
              # Install SDK dependencies (from combined cache) and build SDK
              pushd sdk
              npm ci --offline --no-audit --no-fund
              # patchShebangs skips symlinks; .bin/ entries are symlinks.
              # Patch the full node_modules tree to catch real tsc etc.
              patchShebangs node_modules
              npm run build
              popd

              # Build hooks (runtime dependency for the installer)
              node scripts/build-hooks.js
            '';

            installPhase = ''
              runHook preInstall

              # BuildNpmPackage's default installPhase expects standard npm layout.
              # GSD has a subpackage (sdk/) so we do it ourselves.

              mkdir -p "$out/lib/node_modules/$pname"
              cp -r . "$out/lib/node_modules/$pname/"
              rm -rf "$out/lib/node_modules/$pname/node_modules"
              cp -r node_modules "$out/lib/node_modules/$pname/"

              # Prune dev deps now that build is done
              cd "$out/lib/node_modules/$pname"
              npm prune --omit=dev --no-audit --no-fund
              cd sdk
              npm prune --omit=dev --no-audit --no-fund 2>/dev/null || true
              rm -rf .cache 2>/dev/null || true

              # Create bin symlinks
              mkdir -p "$out/bin"
              ln -s "$out/lib/node_modules/$pname/bin/install.js" "$out/bin/get-shit-done-cc"
              ln -s "$out/lib/node_modules/$pname/bin/gsd-sdk.js" "$out/bin/gsd-sdk"
              ln -s "$out/lib/node_modules/$pname/bin/gsd-sdk.js" "$out/bin/gsd-tools"

              runHook postInstall
            '';

            meta = with pkgs.lib; {
              description = "A meta-prompting, context engineering and spec-driven development system for Claude Code, OpenCode, Gemini CLI, and more";
              homepage = "https://github.com/gsd-build/get-shit-done";
              license = licenses.mit;
              mainProgram = "get-shit-done-cc";
              platforms = platforms.unix;
            };
          };

          default = get-shit-done;
        }
      );

      apps = forAllSystems (system: {
        get-shit-done = {
          type = "app";
          program = "${self.packages.${system}.get-shit-done}/bin/get-shit-done-cc";
        };
        gsd-sdk = {
          type = "app";
          program = "${self.packages.${system}.get-shit-done}/bin/gsd-sdk";
        };
        gsd-tools = {
          type = "app";
          program = "${self.packages.${system}.get-shit-done}/bin/gsd-tools";
        };
        default = self.apps.${system}.get-shit-done;
      });
    };
}
