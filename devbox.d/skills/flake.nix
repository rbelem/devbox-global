{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs = { self, nixpkgs, ... }:
    let
      systems = [ "x86_64-linux" ];
      forAllSystems = nixpkgs.lib.genAttrs systems;
    in
    {
      packages = forAllSystems (system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
          version = "1.5.19";
          src = pkgs.fetchFromGitHub {
            owner = "vercel-labs";
            repo = "skills";
            rev = "v${version}";
            hash = "sha256-lxf2ODxgwin83JHRrDynMccTFtCo+tYFb053XrS1IqA=";
          };

        in
        {
          default = pkgs.skills.overrideAttrs (oldAttrs: {
            inherit version src;
            pnpmDeps = pkgs.fetchPnpmDeps {
              pname = oldAttrs.pname;
              inherit version src;
              fetcherVersion = 3;
              hash = "sha256-wntHp5UT21wD1myxj8EQafQis5QMuQ9U2PKiKg2jalw=";
            };
          });
        }
      );
    };
}
