# Herdr desktop app - terminals and coding agents that keep running.
# The app binary ships prebuilt from releases.herdr.dev (the GitHub repo has
# no release assets); update-flake tracks the release manifest at
# https://releases.herdr.dev/app/latest.json and fills the hashes from it.
{
  description = "herdr-app - Herdr desktop app: terminals and coding agents that keep running";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs =
    { self, nixpkgs }:
    let
      supportedSystems = [
        "x86_64-linux"
        "aarch64-linux"
      ];
      forAllSystems = nixpkgs.lib.genAttrs supportedSystems;

      version = "0.1.15";

      systemToTarget = {
        "x86_64-linux" = "linux-x86_64";
        "aarch64-linux" = "linux-aarch64";
      };

      # Literal SRI hashes only. This map sits OUTSIDE pkgs scope, so
      # pkgs.lib.fakeHash does not evaluate and a bump can reset them.
      # Upstream publishes them as hex sha256 in the manifest:
      #   nix hash convert --hash-algo sha256 --to sri <hex>
      systemToHash = {
        "x86_64-linux" = "sha256-+Z4eBL6CwOELL2nudAPKNDhvSA2SUR31hlr0cD52Vd0=";
        "aarch64-linux" = "sha256-Dl/ZWgVkUuwx4y/mqlpHqLHUICCujzoQzaLgoQAdQSQ=";
      };
    in
    {
      packages = forAllSystems (
        system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
        in
        rec {
          herdr-app = pkgs.stdenv.mkDerivation rec {
            pname = "herdr-app";
            inherit version;

            # upstream: herdrdev/herdr-app
            src = pkgs.fetchurl {
              url = "https://releases.herdr.dev/app/${version}/herdr-app-${systemToTarget.${system}}.tar.gz";
              hash = systemToHash.${system};
            };

            dontUnpack = true;
            # The binary ships prebuilt; stripping buys nothing.
            dontStrip = true;

            # The payload's ELF interpreter is /lib64/ld-linux-x86-64.so.2, which
            # on NixOS is nix-ld and hands the binary the SYSTEM glibc. The hook
            # points the interpreter at the store's glibc and fills the RPATH
            # with the libraries below.
            nativeBuildInputs = with pkgs; [
              autoPatchelfHook
              makeWrapper
            ];

            # DT_NEEDED libraries, plus the ones wgpu/winit dlopen at runtime
            # and that therefore never show up in DT_NEEDED.
            runtimeLibs = with pkgs; [
              libxcb
              libxkbcommon
              # dlopened by wgpu for the Wayland backend
              wayland
              # libEGL / libvulkan, dlopened by wgpu; without them the app dies at start-up
              libglvnd
              vulkan-loader
              # dlopened for text shaping / font discovery
              fontconfig
              freetype
              libgcc.lib
            ];

            # The same list as buildInputs, so the hook can resolve what the
            # binary links against and put those directories in its RPATH.
            buildInputs = runtimeLibs;

            installPhase = ''
              runHook preInstall

              tar -xzf "$src" -C "$TMPDIR"

              # The tree has to stay together: HERDR ships the binary, its
              # icon and the notices as one directory.
              mkdir -p $out/lib/herdr-app
              install -m755 "$TMPDIR/herdr-app/herdr-app" $out/lib/herdr-app/herdr-app

              install -D -m644 "$TMPDIR/herdr-app/herdr-app.svg" \
                $out/share/icons/hicolor/scalable/apps/herdr-app.svg
              install -D -m644 "$TMPDIR/herdr-app/LICENSE" \
                $out/share/licenses/herdr-app/LICENSE
              install -D -m644 "$TMPDIR/herdr-app/THIRD-PARTY-NOTICES" \
                $out/share/licenses/herdr-app/THIRD-PARTY-NOTICES

              # Desktop entry; devbox puts $out/bin on PATH, the desktop
              # entry and icon land in the profile's share/ tree.
              install -D -m644 /dev/stdin $out/share/applications/herdr-app.desktop <<EOF
              [Desktop Entry]
              Type=Application
              Name=Herdr
              Comment=Terminals and coding agents that keep running
              Exec=$out/bin/herdr-app
              Icon=herdr-app
              Terminal=false
              Categories=Development;
              StartupWMClass=herdr-app
              EOF

              makeWrapper $out/lib/herdr-app/herdr-app $out/bin/herdr-app \
                --prefix LD_LIBRARY_PATH : "${pkgs.lib.makeLibraryPath runtimeLibs}"

              runHook postInstall
            '';

            meta = with pkgs.lib; {
              description = "Herdr desktop app - terminals and coding agents that keep running";
              homepage = "https://github.com/herdrdev/herdr-app";
              license = licenses.asl20;
              mainProgram = "herdr-app";
              platforms = supportedSystems;
            };
          };

          default = herdr-app;
        }
      );

      apps = forAllSystems (system: {
        herdr-app = {
          type = "app";
          program = "${self.packages.${system}.herdr-app}/bin/herdr-app";
        };
        default = self.apps.${system}.herdr-app;
      });
    };
}
