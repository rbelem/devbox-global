{
  description = "open-code-review - AI-powered code review CLI";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs =
    { self, nixpkgs }:
    let
      systems = [
        "x86_64-linux"
        "aarch64-linux"
        "x86_64-darwin"
        "aarch64-darwin"
      ];
      forAllSystems = nixpkgs.lib.genAttrs systems;

      # Map Nix system names to open-code-review release asset names
      systemToTarget = {
        x86_64-linux = "linux-amd64";
        aarch64-linux = "linux-arm64";
        x86_64-darwin = "darwin-amd64";
        aarch64-darwin = "darwin-arm64";
      };

      version = "1.13.7";

      # Hashes via API asset digests / nix store prefetch-file — never build-capture
      # for this repo (its CDN serves stale release bytes; see skill pitfall 12).
      perArchSha256 = {
        x86_64-linux = "sha256-jB/3hhYbbcDo3LBhB/GL2othgbOc5XNACt1KOfkM8Z0=";
        aarch64-linux = "sha256-8Yvg5GeqI6XZlms4/A+JFEuTKXCiCCgA6s1AYrklf/o=";
        x86_64-darwin = "sha256-+ntj8l5wAq7DjmmAsHHRtT5mga654US3v+hIM95ePeY=";
        aarch64-darwin = "sha256-zi6rSVSD+bEZmStIJTpOL2lpwnw7AlFDUNnnqgCDtOg=";
      };
    in
    {
      packages = forAllSystems (
        system:
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
