{
  description = "yogurt - Private AI meeting notes that stay on your computer (NixOS-compatible)";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs =
    { self, nixpkgs }:
    let
      supportedSystems = [ "x86_64-linux" ];
      forAllSystems =
        f: nixpkgs.lib.genAttrs supportedSystems (system: f nixpkgs.legacyPackages.${system});

      version = "0.3.65";
    in
    {
      packages = forAllSystems (pkgs: rec {
        yogurt = pkgs.appimageTools.wrapType2 (finalAttrs: {
          pname = "yogurt";
          inherit version;

          # Upstream publishes the Linux build as an AppImage only
          # (Yogurt-linux-x86_64.AppImage). The desktop entry upstream ships
          # uses `AppRun --no-sandbox`, so this package wraps the AppImage in
          # the standard appimage FHS env instead.
          src = pkgs.fetchurl {
            url = "https://github.com/FrigadeHQ/yogurt/releases/download/v${version}/Yogurt-linux-x86_64.AppImage";
            hash = "sha256-r3lNVgNBKLMi991FGR0R/cfuf5vV+48EOJ5ulCffC+8=";
          };

          # The AppImage bundles chromium/electron but not the GTK side; the
          # default appimage FHS env covers the gtk3/nss/alsa/X11 set.
          extraInstallCommands = ''
            install -Dm644 ${finalAttrs.contents}/yogurt.png \
              $out/share/icons/hicolor/512x512/apps/yogurt.png

            # Upstream's desktop entry uses `AppRun`, which is not on PATH.
            install -Dm644 /dev/stdin $out/share/applications/yogurt.desktop <<EOF
            [Desktop Entry]
            Type=Application
            Name=Yogurt
            Comment=Free, private, open-source AI meeting notes for Linux.
            Exec=yogurt --no-sandbox %U
            Terminal=false
            Icon=yogurt
            StartupWMClass=yogurt
            Categories=Office;
            MimeType=x-scheme-handler/yogurt;
            EOF
          '';

          meta = with pkgs.lib; {
            description = "Private AI meeting notes that stay on your computer; free, open-source alternative to Granola";
            homepage = "https://github.com/FrigadeHQ/yogurt";
            license = licenses.mit;
            sourceProvenance = with sourceTypes; [ binaryNativeCode ];
            platforms = [ "x86_64-linux" ];
            mainProgram = "yogurt";
          };
        });

        default = yogurt;
      });

      apps = forAllSystems (pkgs: {
        yogurt = {
          type = "app";
          program = "${self.packages.${pkgs.system}.yogurt}/bin/yogurt";
        };
        default = self.apps.${pkgs.system}.yogurt;
      });
    };
}
