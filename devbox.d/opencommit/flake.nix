{
  description = "opencommit - AI-powered git commit message generator";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { self, nixpkgs }:
    let
      systems = [ "x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin" ];
      forAllSystems = nixpkgs.lib.genAttrs systems;

      version = "3.3.9";
    in
    {
      packages = forAllSystems (system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
        in
        {
          default = pkgs.stdenvNoCC.mkDerivation {
            pname = "opencommit";
            inherit version;

            src = pkgs.fetchurl {
              url = "https://registry.npmjs.org/opencommit/-/opencommit-${version}.tgz";
              hash = "sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
            };

            nativeBuildInputs = [ pkgs.makeWrapper ];

            installPhase = ''
              runHook preInstall

              mkdir -p $out/lib/node_modules/opencommit
              cp -r out package.json $out/lib/node_modules/opencommit/

              mkdir -p $out/bin
              makeWrapper ${pkgs.nodejs}/bin/node \
                $out/bin/opencommit \
                --add-flags "$out/lib/node_modules/opencommit/out/cli.cjs"
              ln -s opencommit $out/bin/oco

              runHook postInstall
            '';

            meta = with pkgs.lib; {
              description = "Auto-generate impressive commits in 1 second";
              longDescription = ''
                A CLI that generates impressive git commit messages with AI.
                Killing lame commits with AI. Supports OpenAI, Anthropic, Azure,
                Ollama, Gemini, and other LLM providers.
              '';
              homepage = "https://github.com/di-sukharev/opencommit";
              license = licenses.mit;
              mainProgram = "opencommit";
              platforms = systems;
              maintainers = [ ];
            };
          };
        }
      );
    };
}
