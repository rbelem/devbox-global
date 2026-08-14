{
  description = "pdf-inspector - Fast PDF classification, text extraction, and Markdown conversion (pdf2md / detect-pdf)";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { self, nixpkgs }:
    let
      supportedSystems = [ "x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin" ];
      forAllSystems = f: nixpkgs.lib.genAttrs supportedSystems (system: f nixpkgs.legacyPackages.${system});
    in
    {
      packages = forAllSystems (pkgs: rec {
        pdf-inspector = pkgs.rustPlatform.buildRustPackage rec {
          pname = "pdf-inspector";
          version = "1.14.2";

          src = pkgs.fetchFromGitHub {
            owner = "firecrawl";
            repo = "pdf-inspector";
            rev = "v${version}";
            #hash = pkgs.lib.fakeHash;
            hash = "sha256-Y++ThHB4g11gomBrhPC4SuYqrE0xWHAezAbE/CnBKyA=";
          };

          #cargoHash = pkgs.lib.fakeHash;
          # Repo doesn't commit Cargo.lock; ship generated one (postPatch copies it into src).
          postPatch = ''
            cp ${./Cargo.lock} Cargo.lock
          '';
          cargoLock = {
            lockFile = ./Cargo.lock;
          };

          doCheck = false;

          meta = with pkgs.lib; {
            description = "Fast PDF classification, text extraction, and Markdown conversion";
            homepage = "https://github.com/firecrawl/pdf-inspector";
            license = licenses.mit;
            mainProgram = "pdf2md";
            platforms = supportedSystems;
          };
        };

        default = pdf-inspector;
      });

      apps = forAllSystems (pkgs: {
        pdf-inspector = {
          type = "app";
          program = "${self.packages.${pkgs.system}.pdf-inspector}/bin/pdf2md";
        };
        default = self.apps.${pkgs.system}.pdf-inspector;
      });
    };
}
