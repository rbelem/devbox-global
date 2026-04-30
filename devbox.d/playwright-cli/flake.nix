{
  description = "Playwright CLI - Browser automation CLI for AI agents";

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
          version = "0.1.9";

          # Get the real hashes:
          #   1. Set srcHash and npmDepsHash to pkgs.lib.fakeHash
          #   2. Run: nix build .#default
          #   3. Replace with the got hashes from the error messages
          srcHash = "sha256-w1mPi1CxmOsQAo6ruQAb7s+omrdG+Pnn0jZd7mt0yQA=";
          # npmDepsHash = pkgs.lib.fakeHash;
          npmDepsHash = "sha256-garaR0SHwpMBedIWb4CSBP5ZCfmm1eetufFyjQaipEE=";

          src = pkgs.fetchFromGitHub {
            owner = "microsoft";
            repo = "playwright-cli";
            rev = "v${version}";
            hash = srcHash;
          };
        in
        {
          default = pkgs.buildNpmPackage rec {
            pname = "playwright-cli";
            inherit version src npmDepsHash;

            dontNpmBuild = true;

            postInstall = ''
              wrapProgram $out/bin/playwright-cli \
                --set PLAYWRIGHT_BROWSERS_PATH ${pkgs.playwright-driver.browsers}
            '';

            meta = with pkgs.lib; {
              description = "Playwright CLI with SKILLS - Browser automation CLI for AI agents";
              homepage = "https://github.com/microsoft/playwright-cli";
              license = licenses.asl20;
              mainProgram = "playwright-cli";
              platforms = systems;
            };
          };
        }
      );
    };
}