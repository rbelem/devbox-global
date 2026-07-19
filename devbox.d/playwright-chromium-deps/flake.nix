{
  description = "System libs needed by Playwright's bundled Chromium on NixOS. LD_LIBRARY_PATH target.";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { self, nixpkgs }:
    let
      systems = [ "x86_64-linux" "aarch64-linux" ];
      forAllSystems = nixpkgs.lib.genAttrs systems;
    in
    {
      packages = forAllSystems (system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
          # Complete set of runtime libs Playwright's bundled chromium needs.
          # Derived by `ldd chrome | grep 'not found'` against a bare NixOS env.
          # Update this list if a new Playwright version pulls in additional deps.
          runtimeDeps = with pkgs; [
            glib.out        # libglib/libgobject/libgio (default = bin)
            nspr
            nss
            at-spi2-core    # provides libatk-1.0 and libatk-bridge-2.0
            dbus.lib        # libdbus-1.so.3 (default = daemon bin)
            alsa-lib
            cairo
            cups.lib        # libcups.so.2 (default = bin)
            expat
            libgbm          # libgbm
            pango.out       # libpango-1.0.so.0 (default = bin)
            systemdMinimal # libudev
            xorg.libX11
            xorg.libxcb
            xorg.libXcomposite
            xorg.libXdamage
            xorg.libXext
            xorg.libXfixes
            libxkbcommon
            xorg.libXrandr
          ];
        in
        {
          default = pkgs.buildEnv {
            name = "playwright-chromium-deps";
            # Symlink every dep's /lib into one tree so a single LD_LIBRARY_PATH
            # entry covers them all. buildEnv collisions are resolved by keeping
            # the first occurrence.
            paths = runtimeDeps;
            pathsToLink = [ "/lib" ];
            ignoreCollisions = true;
          };
        });
    };
}
