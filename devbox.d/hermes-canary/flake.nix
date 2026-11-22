{
  # The canary track of hermes-agent: the daily pre-release upstream
  # publishes as a rolling canary build (vX.Y.Z+canary.<timestamp>), as
  # opposed to the stable tags the hermes-agent flake tracks. The two
  # tracks cannot share a flake: the version detector resolves one input
  # per flake, so a `#canary` attribute on hermes-agent would report the
  # stable input's version. This flake is the canary twin; it is a
  # deliberate copy of hermes-agent/flake.nix, self-contained like every
  # devbox.d flake.
  #
  # Pinned to a canary tag, but bumped by hand: update-flake sees the
  # newest stable release in the v0 line and would move this flake off
  # the canary track. Pick the latest vX.Y.Z+canary.<timestamp> tag and
  # update every version spelling, then refresh the flake.lock input.
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    hermes-canary.url = "github:NousResearch/hermes-agent/v0.23.3+canary.20261120T064609Z";
    # The tree deliberately does not build against the nixos-unstable
    # branch: upstream's flake.lock at v0.23.3+canary.20261120T064609Z
    # pins nixpkgs at 02c087f3fe673c9e317f206a627cb6b910336dbe (patchelf
    # 0.19.2). Their pm artifacts (ffmpeg, node, pnpm, python prebuilts)
    # are patchelf'd with a NixOS/patchelf#672 fix that only applies to
    # 0.19.2, and the branch tip today ships 0.15.2, in which the patch
    # does not apply. Keep this rev in sync with the hermes-canary
    # flake.lock whenever the canary input is bumped. Our own nixpkgs
    # (used for the Electron desktop) stays at the nixos-unstable branch.
    hermes-canary.inputs.nixpkgs.url = "github:NixOS/nixpkgs/02c087f3fe673c9e317f206a627cb6b910336dbe";
  };

  outputs =
    {
      self,
      nixpkgs,
      hermes-canary,
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
          upstream = hermes-canary.packages.${system};
          # Upstream's nix source build stamps the agent as v0.0.0 (the
          # derivation `version` argument defaults to "0.0.0" and nothing
          # overrides it), which makes `hermes --version` print the
          # placeholder and its update notifier always report an update.
          # Thread the tag's version through; update-flake rewrites both
          # spellings.
          upstreamAgent = upstream.default.override { version = "0.23.3+canary.20261120T064609Z"; };
          # Scrub host python env: an inherited PYTHONPATH from a different
          # python minor (e.g. the devbox profile's python3.14 site-packages)
          # shadows the bundled pydantic_core cpython-312 .so and crashes
          # `hermes serve` (backend dies -> desktop shows no agent).
          hermes =
            pkgs.runCommand "hermes-canary"
              {
                nativeBuildInputs = [ pkgs.makeWrapper ];
                meta.mainProgram = "hermes-canary";
              }
              ''
                mkdir -p $out/bin
                makeWrapper ${upstreamAgent}/bin/hermes $out/bin/hermes-canary \
                  --unset PYTHONPATH --unset VIRTUAL_ENV
                makeWrapper ${upstreamAgent}/bin/hermes-agent $out/bin/hermes-agent-canary \
                  --unset PYTHONPATH --unset VIRTUAL_ENV
                makeWrapper ${upstreamAgent}/bin/hermes-acp $out/bin/hermes-acp-canary \
                  --unset PYTHONPATH --unset VIRTUAL_ENV
              '';

          # Upstream's nix/desktop.nix builds node-pty against
          # `electron.headers` (version-locked to the `electron` it is given)
          # instead of a pinned tarball + hash, so there is no hash to
          # substitute anymore. Upstream also renders its icons into a
          # separate output, but the tag ships the rendered icons in the
          # tree (CI checks them against the generator); copy them instead
          # of re-rendering with a venv of Pillow + resvg.
          desktopIcons = pkgs.runCommand "hermes-canary-icons" { } ''
            mkdir -p $out/apps/desktop
            cp -r ${hermes-canary}/apps/desktop/public $out/apps/desktop/public
            cp -r ${hermes-canary}/apps/desktop/assets $out/apps/desktop/assets
          '';
          # Electron desktop app (hermes-desktop-canary binary + XDG launcher).
          # The `hermes desktop` CLI subcommand is source-checkout-only;
          # upstream's nix build ships the GUI as this separate package.
          # Upstream also exports packages.desktop, but it is built against
          # the `electron` of this nixpkgs, and this nixpkgs builds electron
          # from Chromium source; electron_43-bin is the prebuilt of the same
          # 43.x series and ships the version-locked headers node-pty
          # compiles against (${electron.headers}, no pinned tarball hash
          # involved).
          desktopApp = pkgs.callPackage "${hermes-canary}/nix/desktop.nix" {
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
            pkgs.runCommand "hermes-desktop-canary"
              {
                nativeBuildInputs = [ pkgs.makeWrapper ];
                meta.mainProgram = "hermes-desktop-canary";
              }
              ''
                mkdir -p $out/bin $out/libexec
                install -Dm755 ${desktopApp}/bin/hermes-desktop \
                  $out/libexec/hermes-desktop-canary
                # Force X11 for the same reason as hermes-desktop (see there).
                substituteInPlace $out/libexec/hermes-desktop-canary \
                  --replace-fail "${upstreamAgent}/bin/hermes" "${hermes}/bin/hermes-canary" \
                  --replace-fail " --enable-features=WaylandWindowDecorations " \
                  " --enable-features=WaylandWindowDecorations --ozone-platform=x11 "
                makeWrapper $out/libexec/hermes-desktop-canary $out/bin/hermes-desktop-canary \
                  --unset PYTHONPATH --unset VIRTUAL_ENV
              '';
        }
      );
    };
}
