{
  description = "OpenCode built from source (overlay on official nixpkgs)";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs = { self, nixpkgs }:
    let
      systems = [ "x86_64-linux" ];
      forAllSystems = nixpkgs.lib.genAttrs systems;
    in
    {
      packages = forAllSystems (system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
          version = "1.14.28";
          srcHash = "sha256-lsyjM6rhSv1HzEd2d/+aGHqrYMARj+TrFrLMGY2X59U=";
          # Get the real hash:
          #   cd ~/.local/share/devbox/global/current/devbox.d/opencode
          #   nix build .#opencode-git 2>&1 | grep "got:"
          # Then paste the sha256-... value below
          nodeModulesHash = "sha256-shMfcEeS4T/gUKILrXmFTnXISg4CcL682YniuaNlb2I=";


          src = pkgs.fetchFromGitHub {
            owner = "anomalyco";
            repo = "opencode";
            rev = "v${version}";
            hash = srcHash;
          };
        in
        {
          default = pkgs.opencode.overrideAttrs (oldAttrs: {
            inherit version src;
            node_modules = oldAttrs.node_modules.overrideAttrs (oldNode: {
              inherit src version;
              pname = "opencode-node_modules";
              outputHash = nodeModulesHash;
              outputHashAlgo = "sha256";
              outputHashMode = "recursive";
            });
          });
        }
      );
    };
}
