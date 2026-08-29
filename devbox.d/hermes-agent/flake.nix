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
      packages = forAllSystems (system: {
        default = hermes-agent.packages.${system}.default;
      });
    };
}
