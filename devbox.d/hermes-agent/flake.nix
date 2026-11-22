{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    # Pin to a tag (not main) so update-flake can parse the version from
    # the input URL and detect updates. Upstream builds via uv2nix and
    # exports packages.default (full build), minimal, messaging, tui, web
    # and desktop.
    hermes-agent.url = "github:NousResearch/hermes-agent/v0.23.3";
    # The tree deliberately does not build against the nixos-unstable
    # branch: upstream's flake.lock at v0.23.2 pins nixpkgs at
    # 02c087f3fe673c9e317f206a627cb6b910336dbe (patchelf 0.19.2). Their pm
    # artifacts (ffmpeg, node, pnpm, python prebuilts) are patchelf'd with a
    # NixOS/patchelf#672 fix that only applies to 0.19.2, and the branch
    # tip today ships 0.15.2, in which the patch does not apply. Keep this
    # rev in sync with the hermes-agent flake.lock whenever the hermes
    # input is bumped. Our own nixpkgs (used for the Electron desktop, see
    # below) stays at the nixos-unstable branch.
    hermes-agent.inputs.nixpkgs.url = "github:NixOS/nixpkgs/02c087f3fe673c9e317f206a627cb6b910336dbe";
  };

  outputs =
    {
      self,
      nixpkgs,
      hermes-agent,
      ...
    }:
    let
      systems = [ "x86_64-linux" ];
      forAllSystems = nixpkgs.lib.genAttrs systems;
    in
    {
      packages = forAllSystems (
        system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
          upstream = hermes-agent.packages.${system};
          # Upstream's nix source build stamps the agent as v0.0.0 (the
          # derivation `version` argument defaults to "0.0.0" and nothing
          # overrides it), which makes `hermes --version` print the
          # placeholder and its update notifier always report an update.
          # Thread the tag's version through; update-flake rewrites both
          # spellings.
          upstreamAgent = upstream.default.override { version = "0.23.3"; };
          # Scrub host python env: an inherited PYTHONPATH from a different
          # python minor (e.g. the devbox profile's python3.14 site-packages)
          # shadows the bundled pydantic_core cpython-312 .so and crashes
          # `hermes serve` (backend dies -> desktop shows no agent).
          hermes =
            pkgs.runCommand "hermes-agent"
              {
                nativeBuildInputs = [ pkgs.makeWrapper ];
                meta.mainProgram = "hermes";
              }
              ''
                mkdir -p $out/bin
                for f in hermes hermes-agent hermes-acp; do
                  makeWrapper ${upstreamAgent}/bin/$f $out/bin/$f \
                    --unset PYTHONPATH --unset VIRTUAL_ENV
                done
              '';

          # Upstream's nix/desktop.nix builds node-pty against
          # `electron.headers` (version-locked to the `electron` it is given)
          # instead of a pinned tarball + hash, so there is no hash to
          # substitute anymore. Upstream also renders its icons into a
          # separate output, but the tag ships the rendered icons in the
          # tree (CI checks them against the generator); copy them instead
          # of re-rendering with a venv of Pillow + resvg.
          # GBM note: the prebuilt electron dlopens the host's GBM driver
          # from /run/opengl-driver/lib/gbm, and a nixpkgs whose glibc is
          # older than the one that host mesa was built with cannot load it:
          #   MESA-LOADER: failed to open dri: .../libm.so.6:
          #     version `GLIBC_2.43' not found (required by .../libgallium-26.2.6.so)
          # The GPU process then dies and the shell renders in software.
          # Our nixpkgs ships a new-enough glibc; keep it that way when
          # bumping the flake.
          desktopIcons = pkgs.runCommand "hermes-icons" { } ''
            mkdir -p $out/apps/desktop
            cp -r ${hermes-agent}/apps/desktop/public $out/apps/desktop/public
            cp -r ${hermes-agent}/apps/desktop/assets $out/apps/desktop/assets
          '';
          # Electron desktop app (hermes-desktop binary + XDG launcher).
          # The `hermes desktop` CLI subcommand is source-checkout-only;
          # upstream's nix build ships the GUI as this separate package.
          # Upstream also exports packages.desktop, but it is built against
          # the `electron` of this nixpkgs, and this nixpkgs builds electron
          # from Chromium source; electron_43-bin is the prebuilt of the same
          # 43.x series and ships the version-locked headers node-pty
          # compiles against (${electron.headers}, no pinned tarball hash
          # involved).
          desktopApp = pkgs.callPackage "${hermes-agent}/nix/desktop.nix" {
            hermesNpmLib = upstreamAgent.passthru.hermesNpmLib;
            hermesAgent = upstreamAgent;
            # electron_43-bin, not `electron`: on Linux nixpkgs now builds
            # electron from Chromium source.
            electron = pkgs.electron_43-bin;
            installStampFile = upstreamAgent.passthru.installStampFile;
            generatedIcons = desktopIcons;
          };
        in
        rec {
          inherit hermes;
          default = hermes;
          # Rewrapped to point HERMES_DESKTOP_HERMES at the scrubbed agent
          # above. Upstream's launcher is a bash script with that export
          # baked in, so a --set here would be clobbered a line later: patch
          # the export itself and wrap the copy.
          desktop =
            pkgs.runCommand "hermes-desktop"
              {
                nativeBuildInputs = [ pkgs.makeWrapper ];
                meta.mainProgram = "hermes-desktop";
              }
              ''
                mkdir -p $out/bin $out/libexec
                install -Dm755 ${desktopApp}/bin/hermes-desktop \
                  $out/libexec/hermes-desktop
                # Force X11: on this machine the Wayland ozone platform
                # crashes the GPU process at launch (wayland_surface_factory
                # / GPU process isn't usable -> FATAL), because Electron
                # cannot pair Wayland with Vulkan there; x11 works. An
                # explicit --ozone-platform passed by the caller still wins
                # (it lands after ours in argv).
                substituteInPlace $out/libexec/hermes-desktop \
                  --replace-fail "${upstreamAgent}/bin/hermes" "${hermes}/bin/hermes" \
                  --replace-fail " --enable-features=WaylandWindowDecorations " \
                  " --enable-features=WaylandWindowDecorations --ozone-platform=x11 "
                makeWrapper $out/libexec/hermes-desktop $out/bin/hermes-desktop \
                  --unset PYTHONPATH --unset VIRTUAL_ENV
              '';
        }
      );
    };
}
