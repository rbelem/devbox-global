{
  description = "OpenCode built from source (overlay on nixpkgs)";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs = { self, nixpkgs }:
    let
      systems = [ "x86_64-linux" ];
      forAllSystems = nixpkgs.lib.genAttrs systems;

      version = "1.18.9";

      # Hash capture workflow for srcHash / nodeModulesHash:
      #   1. uncomment fakeHash lines and comment real hashes
      #   2. devbox global update
      #   3. paste sha256-... values back
      srcHash = "sha256-uvKzjPquhjm5OdDdoqexJQfDkN0OOXOW8RbdSka12NQ=";
      nodeModulesHash = "sha256-cXA4umq5rPApiQdpFGB8jGmFB+e1+WkoFZUXKak1za0=";
    in
    {
      packages = forAllSystems (system:
        let
          pkgs = nixpkgs.legacyPackages.${system};

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

            patches = (oldAttrs.patches or []) ++ [
              ./fix-deepseek-reasoning-content.patch
            ];

            # The nixpkgs opencode package defines `node_modules` as a
            # fixed-output sub-derivation whose outputHash is pinned to
            # nixpkgs' version. When we override src/version, the
            # node_modules sub-derivation is rebuilt against the new
            # source but keeps the old hash. Override it here.
            node_modules = oldAttrs.node_modules.overrideAttrs (_: {
              inherit version src;
              outputHash = nodeModulesHash;
            });
          });
        }
      );
    };
}
