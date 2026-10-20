{
  description = "cua-spaces - Cua Spaces desktop app (Electron) for computer-use agents";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { self, nixpkgs }: let
    supportedSystems = [ "x86_64-linux" "aarch64-linux" ];
    forAllSystems = nixpkgs.lib.genAttrs supportedSystems;

    version = "0.11.0";

    systemToTarget = {
      "x86_64-linux"  = "amd64";
      "aarch64-linux" = "arm64";
    };

    # Literal SRI hashes only. This map sits OUTSIDE pkgs scope, so
    # pkgs.lib.fakeHash does not evaluate and a bump can reset them.
    systemToHash = {
      "x86_64-linux"  = "sha256-L14LbRBW2wU0cXtuk/ghB+0/FtZK4j1Z2gSNkOY0ifc=";
      "aarch64-linux" = "sha256-eQLlSBbUG6nO6uWm8rDUeqXVZEqCk25W+L4P2JdnE6Y=";
    };
  in {
    packages = forAllSystems (system:
      let
        # The desktop app ships under the FSL, whose competing-use clause makes
        # nixpkgs classify the licence as unfree.
        pkgs = import nixpkgs {
          inherit system;
          config.allowUnfree = true;
        };
      in
      rec {
        cua-spaces = pkgs.stdenv.mkDerivation rec {
          pname = "cua-spaces";
          inherit version;

          # The release line "cua-spaces-v" is what the detector reads between
          # /releases/download/ and the version.
          src = pkgs.fetchurl {
            url = "https://github.com/trycua/cua/releases/download/cua-spaces-v${version}/cua-spaces_${version}_${systemToTarget.${system}}.deb";
            hash = systemToHash.${system};
          };

          dontUnpack = true;
          # The Electron binary is 218 MB; stripping it buys nothing, and the
          # strip would also mangle the bun bytecode in resources/native/.
          dontStrip = true;

          # The payload's ELF interpreter is /lib64/ld-linux-x86-64.so.2, which
          # on NixOS is nix-ld and hands the binary the SYSTEM glibc - older
          # than the one the store's libraries are built against, so the app
          # dies with "GLIBC_2.43 not found". The hook points the interpreter at
          # the store's glibc and fills the RPATH with the libraries below.
          nativeBuildInputs = [ pkgs.dpkg pkgs.gnutar pkgs.makeWrapper pkgs.autoPatchelfHook ];

          # DT_NEEDED libraries, plus the ones Chromium dlopens at runtime and
          # that therefore never show up in DT_NEEDED.
          runtimeLibs = with pkgs; [
            glib
            nspr
            nss
            at-spi2-core
            cups
            dbus
            cairo
            gtk3
            pango
            libX11
            libXcomposite
            libXdamage
            libXext
            libXfixes
            libXrandr
            libgbm
            expat
            libxcb
            libxkbcommon
            udev
            alsa-lib
            libgcc.lib
            # dlopened at runtime; without libEGL.so.1 the app dies at start-up.
            libglvnd
            libnotify
            libsecret
            util-linux
            libXtst
            libXScrnSaver
          ];

          # The same list as buildInputs, so the hook can resolve what the
          # binary links against and put those directories in its RPATH.
          buildInputs = runtimeLibs;

          installPhase = ''
            runHook preInstall

            # dpkg-deb -x fails in the sandbox: the payload ships chrome-sandbox
            # setuid root and dpkg asks tar to preserve the mode. Unpacking the
            # filesystem tar by hand lets tar drop the setuid bit silently.
            root="$TMPDIR/root"
            mkdir -p "$root"
            dpkg-deb --fsys-tarfile "$src" > "$TMPDIR/data.tar"
            tar --extract --directory="$root" --file="$TMPDIR/data.tar"

            # The tree has to stay together: the binary resolves resources/ and
            # its bundled libraries through RPATH $ORIGIN.
            mkdir -p $out/lib/cua-spaces
            cp -R "$root/opt/Cua Spaces/." $out/lib/cua-spaces/

            # The deb's own hicolor icons are dangling symlinks, so the app's
            # tray icon is the closest real image it ships.
            install -D -m644 "$out/lib/cua-spaces/resources/tray/128x128@2x.png" \
              "$out/share/icons/hicolor/256x256/apps/cua-spaces.png"

            install -D -m644 "$root/usr/share/applications/cua-spaces.desktop" \
              "$out/share/applications/cua-spaces.desktop"
            sed -i "s|^Exec=.*|Exec=$out/bin/cua-spaces %U|" \
              "$out/share/applications/cua-spaces.desktop"

            install -D -m644 "$root/usr/share/polkit-1/actions/ai.cua.spaces.policy" \
              "$out/share/polkit-1/actions/ai.cua.spaces.policy"
            sed -i "s|/opt/Cua Spaces|$out/lib/cua-spaces|g" \
              "$out/share/polkit-1/actions/ai.cua.spaces.policy"

            # The Chromium sandbox works on NixOS, so no --no-sandbox.
            makeWrapper $out/lib/cua-spaces/cua-spaces $out/bin/cua-spaces \
              --prefix LD_LIBRARY_PATH : "${pkgs.lib.makeLibraryPath runtimeLibs}"

            runHook postInstall
          '';

          meta = with pkgs.lib; {
            description = "Cua Spaces desktop app (Electron)";
            homepage = "https://github.com/trycua/cua";
            # The desktop app is FSL-1.1-MIT upstream, not MIT.
            license = licenses.fsl11Mit;
            mainProgram = "cua-spaces";
            platforms = supportedSystems;
          };
        };

        default = cua-spaces;
      });

    apps = forAllSystems (system: {
      cua-spaces = {
        type = "app";
        program = "${self.packages.${system}.cua-spaces}/bin/cua-spaces";
      };
      default = self.apps.${system}.cua-spaces;
    });
  };
}
