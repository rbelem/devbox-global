{
  description = "codecanary - AI-powered code review for GitHub PRs";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { self, nixpkgs }:
    let
      systems = [ "x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin" ];
      forAllSystems = nixpkgs.lib.genAttrs systems;

      # Map Nix system names to GoReleaser target triples
      systemToTarget = {
        x86_64-linux   = "linux_amd64";
        aarch64-linux  = "linux_arm64";
        x86_64-darwin  = "darwin_amd64";
        aarch64-darwin = "darwin_arm64";
      };

      # Set to pkgs.lib.fakeHash when updating, then run: devbox global update
      # Copy the real hash from the error message back here.
      version = "0.6.24";

      perArchSha256 = {
        x86_64-linux   = "sha256-vHGc0kgWl9lXPOEoSgAuZSN9BjaUA/hryflBxd7LtnY=";
        aarch64-linux  = "sha256-wrYYNWbA/2X9DOTKsYYftZcZs+tecAJj5ZI62bS+14c=";
        x86_64-darwin  = "sha256-4xBy4aHdvsswsl0sKDKWCI0eENM89V8dNYb643WpOxE=";
        aarch64-darwin = "sha256-X/5TCvLy5ec3khVDvrOZiAR/vM7L4t6f+dJrUDHl40E=";
      };
    in
    {
      packages = forAllSystems (system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
        in
        rec {
          codecanary = pkgs.stdenvNoCC.mkDerivation {
            pname = "codecanary";
            inherit version;

            src = pkgs.fetchurl {
              url = "https://github.com/alansikora/codecanary/releases/download/v${version}/codecanary_${version}_${systemToTarget.${system}}.tar.gz";
              hash = perArchSha256.${system};
            };

            dontBuild = true;
            dontConfigure = true;
            dontUnpack = true;

            installPhase = ''
              mkdir -p $out/bin
              tar -xzf $src
              install -m755 codecanary $out/bin/codecanary
            '';

            meta = {
              description = "AI-powered code review for GitHub pull requests";
              longDescription = ''
                CodeCanary is an AI-powered code review tool for GitHub pull requests.
                It catches bugs, security issues, and quality problems before they land in main.
                Supports multiple LLM providers (Anthropic, OpenAI, OpenRouter, Grok, Claude CLI)
                and provides incremental reviews, conversational thread resolution, and native PR integration.
              '';
              homepage = "https://github.com/alansikora/codecanary";
              license = nixpkgs.lib.licenses.mit;
              platforms = builtins.attrNames perArchSha256;
              maintainers = [ ];
              mainProgram = "codecanary";
            };
          };

          default = codecanary;
        }
      );
    };
}
