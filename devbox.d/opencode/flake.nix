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
          version = "1.14.29";

          # Get the real hash:
          #   cd ~/.local/share/devbox/global/current/devbox.d/opencode
          #   uncomment the lines containing fakeHash and comment the lines containing real hashes
          #   run the command "refresh-global"
          # Then paste the sha256-... value below
          # It will fail twice, for srcHash and nodeModulesHash
          #
          #srcHash = pkgs.lib.fakeHash;
          srcHash = "sha256-nSgd/ld8iG2+Y8ru59ZFZO2DuP5mZoV2GFX+f3nSBKc=";
          #nodeModulesHash = pkgs.lib.fakeHash;
          nodeModulesHash = "sha256-0dBgIXkGplKmq/sbXwhLoKUGwTIZU+TeC74YkByNOYk=";


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
