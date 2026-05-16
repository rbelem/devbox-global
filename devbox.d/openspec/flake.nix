{
  description = "OpenSpec - AI-native system for spec-driven development";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    openspec.url = "github:Fission-AI/OpenSpec/v1.3.1";
  };

  outputs = { self, nixpkgs, openspec }:
    let
      version = "1.3.1";
      supportedSystems = [
        "x86_64-linux"
        "aarch64-linux"
        "x86_64-darwin"
        "aarch64-darwin"
      ];
      forAllSystems = f: nixpkgs.lib.genAttrs supportedSystems (system: f system);
    in
    {
      packages = forAllSystems (system: {
        default = openspec.packages.${system}.default;
      });

      apps = forAllSystems (system: {
        default = {
          type = "app";
          program = "${openspec.packages.${system}.default}/bin/openspec";
        };
      });

      devShells = forAllSystems (system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
        in
        {
          default = pkgs.mkShell {
            buildInputs = with pkgs; [
              nodejs_20
              pnpm_9
            ];
          };
        }
      );
    };
}
