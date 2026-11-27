{
  description = "wigolo (main branch) - Local-first web intelligence MCP server for AI coding agents";

  inputs = {
    # Pinned to stable wigolo's nixpkgs: newer libcs need GLIBC_2.43, ambient profile ships 2.42 — bump together
    nixpkgs.url = "github:NixOS/nixpkgs/88c4c23f3d6e5a4116ee19e148df5a0f2004f861";
    # Bun 1.4.4 is the newest Bun packaged in nixpkgs as of 2026-11-27. The
    # official release (and oven/bun image) is 1.4.5; nixpkgs has not caught
    # up. Keep this input separate so the runtime libs nixpkgs pin stays on
    # glibc 2.42.
    bunPkgs.url = "github:NixOS/nixpkgs/1eb11bb1e8b58b3de37332a744665ec5b9fc023e";
  };

  outputs =
    {
      self,
      nixpkgs,
      bunPkgs,
    }:
    let
      # Tracks the fork's main, carrying the Bun migration and the fork's
      # custom commits. Re-pin to upstream once they are released.
      owner = "rbelem";
      repo = "wigolo";
      rev = "b788856121d87cf7a3c0b42e430dc31f12474d08";
      version = "0.3.4-git.b7888561";

      # Get the real hashes:
      #   1. Set srcHash to pkgs.lib.fakeHash
      #   2. Run: nix build ./devbox.d/wigolo-git#default
      #   3. It will fail for srcHash — copy the "got" hash
      srcHash = "sha256-ncP1U+mBvEyv3HAia8ibQ0uCFj/IE6SJ83C7MooKfgI=";

      systems = [ "x86_64-linux" ];
      forAllSystems = nixpkgs.lib.genAttrs systems;
    in
    {
      packages = forAllSystems (
        system:
        let
          sysPkgs = nixpkgs.legacyPackages.${system};
          bun = bunPkgs.legacyPackages.${system}.bun;

          githubSrc = sysPkgs.fetchFromGitHub {
            inherit owner repo rev;
            hash = srcHash;
          };

          # Playwright Chromium runtime libs (see the wigolo checkout's
          # devbox.d/playwright-libs/flake.nix for the attested set).
          chromiumDeps = sysPkgs.buildEnv {
            name = "playwright-chromium-deps";
            paths = with sysPkgs; [
              glib.out
              nspr
              nss
              at-spi2-core
              dbus.lib
              alsa-lib
              cairo
              cups.lib
              expat
              libgbm
              pango.out
              systemdMinimal
              libx11
              libxcb
              libxcomposite
              libxdamage
              libxext
              libxfixes
              libxkbcommon
              libxrandr
            ];
            pathsToLink = [ "/lib" ];
            ignoreCollisions = true;
          };
        in
        {
          default = sysPkgs.stdenv.mkDerivation {
            pname = "wigolo-git";
            inherit version;
            src = githubSrc;

            nativeBuildInputs = with sysPkgs; [
              python3
              pkg-config
              makeWrapper
              bun
            ];

            buildInputs = with sysPkgs; [
              glib
              nss
              libsecret
            ];

            # bun install runs native postinstall scripts (better-sqlite3,
            # onnxruntime-node, etc.) via the repo's trustedDependencies.
            # Skip the ONNX CUDA blob download as documented in .npmrc; Bun
            # does not export .npmrc keys as npm_config_* env vars.
            ONNXRUNTIME_NODE_INSTALL_CUDA = "skip";

            buildPhase = ''
              runHook preBuild
              bun install --frozen-lockfile
              # Bun's install cache uses symlinks into the ephemeral build dir.
              # Drop it so the Nix closure has no dangling symlinks.
              rm -rf node_modules/.cache
              bun run build
              runHook postBuild
            '';

            installPhase = ''
              runHook preInstall
              mkdir -p $out/lib/node_modules/wigolo
              cp -r . $out/lib/node_modules/wigolo/
              mkdir -p $out/bin
              makeWrapper ${bun}/bin/bun \
                $out/bin/wigolo \
                --add-flags "$out/lib/node_modules/wigolo/dist/index.js" \
                --set NODE_PATH "$out/lib/node_modules" \
                --prefix LD_LIBRARY_PATH : ${chromiumDeps}/lib
              runHook postInstall
            '';

            meta = with sysPkgs.lib; {
              description = "Local-first web intelligence MCP server (main branch, Bun build)";
              homepage = "https://github.com/KnockOutEZ/wigolo";
              license = licenses.agpl3Only;
              mainProgram = "wigolo";
              platforms = systems;
            };
          };
        }
      );
    };
}
