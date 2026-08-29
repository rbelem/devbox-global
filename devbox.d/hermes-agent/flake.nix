{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    # Pin to a tag (not main) so update-flake can parse the version from
    # the input URL and detect updates. Upstream builds via uv2nix and
    # exports packages.default (full build), minimal, messaging, tui, web.
    hermes-agent.url = "github:NousResearch/hermes-agent/v2026.8.27";
  };

  outputs = { self, nixpkgs, hermes-agent, ... }:
    let
      systems = [ "x86_64-linux" ];
      forAllSystems = nixpkgs.lib.genAttrs systems;
    in
    {
      packages = forAllSystems (system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
          upstream = hermes-agent.packages.${system};
          # Scrub host python env: an inherited PYTHONPATH from a different
          # python minor (e.g. the devbox profile's python3.14 site-packages)
          # shadows the bundled pydantic_core cpython-312 .so and crashes
          # `hermes serve` (backend dies -> desktop shows no agent).
          hermes = pkgs.runCommand "hermes-agent" {
            nativeBuildInputs = [ pkgs.makeWrapper ];
            meta.mainProgram = "hermes";
          } ''
            mkdir -p $out/bin
            for f in hermes hermes-agent hermes-acp; do
              makeWrapper ${upstream.default}/bin/$f $out/bin/$f \
                --unset PYTHONPATH --unset VIRTUAL_ENV
            done
          '';
        in
        rec {
          inherit hermes;
          default = hermes;
          # Electron desktop app (hermes-desktop binary + XDG launcher).
          # The `hermes desktop` CLI subcommand is source-checkout-only;
          # upstream's nix build ships the GUI as this separate package.
          # Rewrapped to point HERMES_DESKTOP_HERMES at the scrubbed agent
          # above, otherwise the desktop backend inherits the same broken
          # PYTHONPATH and exits at boot.
          desktop = pkgs.runCommand "hermes-desktop" {
            nativeBuildInputs = [ pkgs.makeWrapper ];
            meta.mainProgram = "hermes-desktop";
          } ''
            mkdir -p $out/bin
            makeWrapper ${upstream.desktop}/bin/hermes-desktop $out/bin/hermes-desktop \
              --unset PYTHONPATH --unset VIRTUAL_ENV \
              --set HERMES_DESKTOP_HERMES ${hermes}/bin/hermes
          '';
        });
    };
}
