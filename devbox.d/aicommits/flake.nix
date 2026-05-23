{
  description = "aicommits - AI-powered git commit message generator";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { self, nixpkgs }:
    let
      systems = [ "x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin" ];
      forAllSystems = nixpkgs.lib.genAttrs systems;

      version = "3.4.0";
    in
    {
      packages = forAllSystems (system:
        let
          pkgs = nixpkgs.legacyPackages.${system};

          # Get the real npmDepsHash:
          #   1. Set npmDepsHash to pkgs.lib.fakeHash
          #   2. Run: nix build "path:...#default"
          #   3. Replace with the hash from the error message
          npmDepsHash = "sha256-iw7zz+jr39Ip8lZi5XS1E9T7FSSYAwND3JF4mSC5D4M=";

          src = pkgs.fetchFromGitHub {
            owner = "Nutlope";
            repo = "aicommits";
            rev = "v${version}";
            hash = "sha256-xh7TM3ThajeOXYCj2Vc246u3kYxA1VCHFWM4QbM8DGo=";
          };
        in
        {
          default = pkgs.buildNpmPackage {
            pname = "aicommits";
            inherit version src npmDepsHash;

            # Requires Node.js >= 22 per upstream
            nodejs = pkgs.nodejs_22;

            # prepack runs `pnpm build && clean-pkg-json` (not available), install manually
            dontNpmInstall = true;

            nativeBuildInputs = [ pkgs.makeWrapper ];

            installPhase = ''
              runHook preInstall

              mkdir -p $out/lib/node_modules/aicommits
              cp -r dist package.json $out/lib/node_modules/aicommits/

              mkdir -p $out/bin
              makeWrapper ${pkgs.nodejs_22}/bin/node \
                $out/bin/aicommits \
                --add-flags "$out/lib/node_modules/aicommits/dist/cli.mjs"
              ln -s aicommits $out/bin/aic

              runHook postInstall
            '';

            meta = with pkgs.lib; {
              description = "A CLI that writes your git commit messages for you with AI";
              longDescription = ''
                A CLI that writes your git commit messages for you with AI.
                Never write a commit message again. Generates commit messages from
                staged git diff using various AI providers (TogetherAI, OpenAI,
                Groq, Ollama, etc.).
              '';
              homepage = "https://github.com/Nutlope/aicommits";
              license = licenses.mit;
              mainProgram = "aicommits";
              platforms = systems;
              maintainers = [ ];
            };
          };
        }
      );
    };
}
