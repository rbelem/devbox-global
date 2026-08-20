{
  description = "open-code-review - AI-powered code review CLI";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { self, nixpkgs }:
    let
      systems = [ "x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin" ];
      forAllSystems = nixpkgs.lib.genAttrs systems;

      # Map Nix system names to open-code-review release asset names
      systemToTarget = {
        x86_64-linux   = "linux-amd64";
        aarch64-linux  = "linux-arm64";
        x86_64-darwin  = "darwin-amd64";
        aarch64-darwin = "darwin-arm64";
      };

      version = "1.9.8";

      # Set each to the fake hash string when updating, then build and capture.
      perArchSha256 = {
        x86_64-linux   = "sha256-Qn8/FX2LpXFtXoSb7jTuS5mDzpayHoMYZGDzG3TsEx0=";
        aarch64-linux  = "sha256-ojyUaLhfljG3busOPucYnQY7mW9SGoOLIrlqFSHQTKY=";
        x86_64-darwin  = "sha256-cuBYEJc9AKm9oQ3RZGhhq3KjH+8r5hYwQ9NPzXbTsLM=";
        aarch64-darwin = "sha256-rOhUTBKZLO/s7H8NIiZf9UcweOoGLwHWgsobCGkf8Pk=";
      };
    in
    {
      packages = forAllSystems (system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
        in
        rec {
          open-code-review = pkgs.stdenvNoCC.mkDerivation {
            pname = "open-code-review";
            inherit version;

            src = pkgs.fetchurl {
              url = "https://github.com/alibaba/open-code-review/releases/download/v${version}/opencodereview-${systemToTarget.${system}}";
              hash = perArchSha256.${system};
            };

            dontBuild = true;
            dontConfigure = true;
            dontUnpack = true;

            installPhase = ''
              runHook preInstall

              mkdir -p $out/bin
              cp $src $out/bin/ocr
              chmod +x $out/bin/ocr

              runHook postInstall
            '';

            meta = {
              description = "AI-powered code review CLI with line-level precision";
              longDescription = ''
                Open Code Review is an AI-powered code review tool that reads Git diffs
                and sends changed files to a configurable LLM (OpenAI or Anthropic) for
                structured review comments with line-level precision. Features built-in
                rule sets (NPE, thread-safety, XSS, SQL injection), workspace and branch
                range review, WebUI viewer, and CI/CD integration.
              '';
              homepage = "https://github.com/alibaba/open-code-review";
              license = nixpkgs.lib.licenses.asl20;
              platforms = builtins.attrNames perArchSha256;
              maintainers = [ ];
              mainProgram = "ocr";
            };
          };

          default = open-code-review;
        }
      );
    };
}
