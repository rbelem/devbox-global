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
          version = "1.5.14";
          src = pkgs.fetchFromGitHub {
            owner = "vercel-labs";
            repo = "skills";
            rev = "v${version}";
            hash = "sha256-176EeM1VhNSBH1cYUUy3oLST21PbV0v+tCNglfM9+6Y=";
          };

        in
        {
          default = pkgs.skills.overrideAttrs (oldAttrs: {
            inherit version src;
            pnpmDeps = pkgs.fetchPnpmDeps {
              pname = oldAttrs.pname;
              inherit version src;
              fetcherVersion = 3;
              hash = "sha256-3GSa4ze859dRA4Yrxw8r3rwZKn7FMSjBMvpz1HTDobU=";
            };
          });
        }
      );
    };
}
