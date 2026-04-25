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
          version = "1.5.1";
          src = pkgs.fetchFromGitHub {
            owner = "vercel-labs";
            repo = "skills";
            rev = "v${version}";
            hash = "sha256-JVJeottMyjxdiGPS7O4QsshKdbwbYcKMvwe/PB7I/Zw=";
          };
        in
        {
          default = pkgs.skills.overrideAttrs (oldAttrs: {
            inherit version src;
            pnpmDeps = pkgs.fetchPnpmDeps {
              pname = oldAttrs.pname;
              inherit version src;
              fetcherVersion = 3;
              hash = "sha256-0CS6BTjTj/TAnMNahTk4Vt/0/2eMxmCGUV9PwI8l4Ao=";
            };
          });
        }
      );
    };
}
