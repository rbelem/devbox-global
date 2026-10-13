{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    neovim-nightly-overlay.url = "github:nix-community/neovim-nightly-overlay";
  };

  outputs = { nixpkgs, neovim-nightly-overlay, ... }:
    let
      systems = [ "x86_64-linux" ];
      forAllSystems = nixpkgs.lib.genAttrs systems;
    in
    {
      packages = forAllSystems (system:
        let
          pkgs = nixpkgs.legacyPackages.${system}.extend neovim-nightly-overlay.overlays.default;
        in
        {
          default = pkgs.wrapNeovim pkgs.neovim {
            extraLuaPackages = ps: [ ps.lpeg ];
            viAlias = true;
            vimAlias = true;
            withNodeJs = true;
            withPython3 = true;
            withRuby = true;
          };
        }
      );
    };
}
