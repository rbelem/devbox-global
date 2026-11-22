{
  description = "ai-memory - long-term memory for AI coding agents";

  # Thin wrapper: re-export the upstream NixOS flake's package so it can be
  # installed as a devbox-global path package like the other devbox.d flakes.
  # Pinned to a tag so bin/update-flake can parse and bump the version.
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    ai-memory.url = "github:akitaonrails/ai-memory/v3.5.1";
  };

  outputs =
    { nixpkgs, ai-memory, ... }:
    let
      systems = [
        "x86_64-linux"
        "aarch64-linux"
        "aarch64-darwin"
      ];
    in
    {
      packages = nixpkgs.lib.genAttrs systems (
        system:
        let
          pkg = ai-memory.packages.${system}.default;
        in
        {
          default = pkg;
          ai-memory = pkg;
        }
      );
    };
}
