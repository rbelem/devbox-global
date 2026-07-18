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

      version = "1.7.12";

      # Set each to the fake hash string when updating, then build and capture.
      perArchSha256 = {
        x86_64-linux   = "sha256-7QXs+QB+CyIzqFLfFwk0bM62H6fR+aEEmRO6RLk5mHM=";
        aarch64-linux  = "sha256-BhiJEvydfxT8tgLIlxqZKE8VS8cXRA55BwylaTiJ+2U=";
        x86_64-darwin  = "sha256-c0QL/KLLpYpx2iLBDClx2cy6lpH/XF0y90OJLpLqeJQ=";
        aarch64-darwin = "sha256-h7nVwn0Xs9MbhrtAazY6RURpb3/EqKWKKi9DjifOup8=";
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
