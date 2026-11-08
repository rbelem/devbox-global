{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    # Pin to a tag (not main) so update-flake can parse the version from
    # the input URL and detect updates. Upstream builds via uv2nix and
    # exports packages.default (full build), minimal, messaging, tui, web.
    hermes-agent.url = "github:NousResearch/hermes-agent/v2026.9.24";
    # Build the tree against OUR nixpkgs instead of upstream's own pin.
    # Electron is the reason: it dlopens the host's GBM driver from
    # /run/opengl-driver/lib/gbm, and a nixpkgs whose glibc is older than the
    # one that host mesa was built with cannot load it:
    #   MESA-LOADER: failed to open dri: .../libm.so.6:
    #     version `GLIBC_2.43' not found (required by .../libgallium-26.2.6.so)
    # The GPU process then dies and the shell renders in software.
    hermes-agent.inputs.nixpkgs.follows = "nixpkgs";
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
                  makeWrapper ${upstream.default}/bin/$f $out/bin/$f \
                    --unset PYTHONPATH --unset VIRTUAL_ENV
                done
              '';

          # Upstream's nix/desktop.nix compiles node-pty against a pinned
          # electron-headers tarball and hardcodes that tarball's hash. The
          # hash in the file is the 41.10.3 one, i.e. the electron their own
          # nixpkgs pin still shipped. Ours ships a newer electron, so the
          # url moves while the hash does not:
          #   hash mismatch in .../node-v43.8.3-headers.tar.gz.drv
          # Re-create their desktop.nix with the current electron's hash.
          # Two sibling paths are interpolated relative to that file, so keep
          # the directory shape and link them through.
          desktopNix = pkgs.runCommand "hermes-desktop-nix" { } ''
            mkdir -p $out/nix
            substitute ${hermes-agent}/nix/desktop.nix $out/nix/desktop.nix \
              --replace-fail \
                "sha256-f8bSbLRmtbP93CJAvEBs+sHWDZ1xP2bcpLhC1EnOmZU=" \
                "sha256-0jYw0LmBYb7Hhg3MSCGHrKOAseDaJkwe1e+0K8551gQ="
            ln -s ${hermes-agent}/apps $out/apps
            ln -s ${hermes-agent}/hermes_cli $out/hermes_cli
          '';
          # Electron desktop app (hermes-desktop binary + XDG launcher).
          # The `hermes desktop` CLI subcommand is source-checkout-only;
          # upstream's nix build ships the GUI as this separate package.
          desktopApp = pkgs.callPackage "${desktopNix}/nix/desktop.nix" {
            hermesNpmLib = upstream.default.passthru.hermesNpmLib;
            hermesAgent = upstream.default;
            # electron_43-bin, not `electron`: on Linux nixpkgs now builds
            # electron from Chromium source, and this pin is the version the
            # headers hash substituted above belongs to.
            electron = pkgs.electron_43-bin;
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
                substituteInPlace $out/libexec/hermes-desktop \
                  --replace-fail "${upstream.default}/bin/hermes" "${hermes}/bin/hermes"
                makeWrapper $out/libexec/hermes-desktop $out/bin/hermes-desktop \
                  --unset PYTHONPATH --unset VIRTUAL_ENV
              '';
        }
      );
    };
}
