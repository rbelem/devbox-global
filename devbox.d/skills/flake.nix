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
              # Bumped fetcherVersion 3 → 4: pnpm_11 in current nixpkgs
              # nixos-unstable rejects fetcherVersion 3 ("is no longer
              # supported").
              fetcherVersion = 4;
              # Pin to pnpm_10: the skills v1.5.19 repo ships a
              # pnpm-lock.yaml in v9 format. pnpm_11 (nixpkgs default)
              # raises ERR_PNPM_LOCKFILE_CONFIG_MISMATCH on it.
              # pnpm_9 is marked insecure in current nixpkgs.
              pnpm = pkgs.pnpm_10;
              hash = "sha256-37nAE0QQ6MWMEdm3pCebFe49QfPMvGtA23zNacECNA0=";
            };
          });
        }
      );
    };
}
