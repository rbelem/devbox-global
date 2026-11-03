{
  description = "hex - local-first voice dictation (Linux beta)";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs =
    { self, nixpkgs }:
    let
      # Upstream's flake and its nix/package.nix are x86_64-linux only; arm64
      # ships as a separate release asset nothing here can run.
      systems = [ "x86_64-linux" ];
      forAllSystems = f: nixpkgs.lib.genAttrs systems (s: f nixpkgs.legacyPackages.${s});

      # release line: v<version> (the app line; SDK tags are @kitlangton/hex@*)
      version = "3.3.0";
      srcHash = "sha256-6MezouvrHX2l1idtXyUUWJHVIXjjY2NHyzrDMfdmJiI=";
    in
    {
      packages = forAllSystems (pkgs: rec {
        # The prebuilt release executable, not a source build: upstream's own
        # nix/package.nix compiles transcribe.cpp with Vulkan shaders and runs
        # the Rust suite, which is several GB of build for a 54 MB asset that
        # upstream ships and tests anyway.
        hex = pkgs.stdenv.mkDerivation {
          pname = "hex";
          inherit version;

          src = pkgs.fetchurl {
            url = "https://github.com/anomalyco/hex/releases/download/v${version}/hex-${version}-linux-x64";
            hash = srcHash;
          };

          nativeBuildInputs = with pkgs; [
            autoPatchelfHook
            makeWrapper
            # Bakes /run/opengl-driver/lib into the runpath on NixOS, the same
            # hook upstream's package.nix uses for the Vulkan driver.
            autoAddDriverRunpath
          ];

          # The ELF's own NEEDED entries are libvulkan, libasound, libxkbcommon,
          # libssl/libcrypto (3.3.0) and libstdc++; libX11/libxcb/wayland/
          # fontconfig are dlopened by winit and fontconfig when the window
          # opens, so they only have to be present. Same set as upstream's
          # package.nix.
          buildInputs = with pkgs; [
            vulkan-loader
            alsa-lib
            libxkbcommon
            openssl
            wayland
            fontconfig
            freetype
            libx11
            libxcb
            libxcursor
            libxrandr
            libxi
            stdenv.cc.cc.lib
          ];

          dontUnpack = true;

          installPhase = ''
            runHook preInstall
            install -Dm755 $src $out/bin/hex
            runHook postInstall
          '';

          # Upstream's runtime wrapping: the Vulkan loader is required even when
          # inference falls back to the CPU, and ALSA_PLUGIN_DIR is what makes
          # PipeWire's ALSA compatibility work. curl, wl-copy and wtype are
          # spawned by name.
          postFixup = ''
            wrapProgram $out/bin/hex \
              --prefix PATH : ${
                pkgs.lib.makeBinPath [
                  pkgs.curl
                  pkgs.wl-clipboard
                  pkgs.wtype
                ]
              } \
              --prefix LD_LIBRARY_PATH : ${
                pkgs.lib.makeLibraryPath [
                  pkgs.vulkan-loader
                  pkgs.openblas
                  pkgs.alsa-lib
                  pkgs.wayland
                  pkgs.libxkbcommon
                  pkgs.fontconfig
                ]
              } \
              --set ALSA_PLUGIN_DIR ${
                pkgs.symlinkJoin {
                  name = "hex-alsa-plugins";
                  paths = [
                    "${pkgs.pipewire}/lib/alsa-lib"
                    "${pkgs.alsa-plugins}/lib/alsa-lib"
                  ];
                }
              }
          '';

          meta = with pkgs.lib; {
            description = "Local-first voice dictation (Linux beta)";
            homepage = "https://anoma.ly/hex/";
            license = licenses.mit;
            mainProgram = "hex";
            platforms = systems;
          };
        };

        default = hex;
      });

      apps = forAllSystems (pkgs: {
        hex = {
          type = "app";
          program = "${self.packages.${pkgs.system}.hex}/bin/hex";
        };
        default = self.apps.${pkgs.system}.hex;
      });
    };
}
