{
  description = "Pre-indexed code knowledge graph for AI coding assistants (rbelem fork with Perl support)";
  # upstream: colbymchenry/codegraph
  # fork-suffix: -perl

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    codegraph-src = {
      url = "github:rbelem/codegraph/v0.9.4-perl";
      flake = false;
    };
  };

  outputs = { self, nixpkgs, codegraph-src }:
    let
      systems = [ "x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin" ];
      forAllSystems = nixpkgs.lib.genAttrs systems;

      version = "0.9.4-perl";
    in
    {
      packages = forAllSystems (system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
        in
        rec {
          codegraph = pkgs.buildNpmPackage {
            pname = "codegraph";
            inherit version;

            src = codegraph-src;

            # Get the real npmDepsHash:
            #   1. Set to pkgs.lib.fakeHash
            #   2. Run: nix build "path:...#default"
            #   3. Replace with the hash from the error message
            npmDepsHash = "sha256-GJfqzykgrgD/KCtf8LupRw31S2cCmwGCF/0PMpzaCrk=";

            nodejs = pkgs.nodejs_22;

            meta = {
              description = "Pre-indexed code knowledge graph for AI coding assistants";
              longDescription = ''
                CodeGraph gives AI coding agents a pre-indexed knowledge graph — symbol
                relationships, call graphs, and code structure. Agents query the graph
                instantly instead of scanning files. ~35% cheaper, ~70% fewer tool calls,
                100% local. Supports Claude Code, Cursor, Codex CLI, OpenCode, and
                Hermes Agent.
              '';
              homepage = "https://github.com/rbelem/codegraph";
              license = nixpkgs.lib.licenses.mit;
              platforms = systems;
              maintainers = [ ];
              mainProgram = "codegraph";
            };
          };

          default = codegraph;
        }
      );

      devShells = forAllSystems (system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
        in
        {
          default = pkgs.mkShell {
            packages = with pkgs; [
              nodejs_22
            ];
          };
        }
      );
    };
}
