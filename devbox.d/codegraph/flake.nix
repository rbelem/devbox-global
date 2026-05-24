{
  description = "Pre-indexed code knowledge graph for Claude Code, Codex, Cursor, OpenCode, and Hermes Agent";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { self, nixpkgs }:
    let
      systems = [ "x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin" ];
      forAllSystems = nixpkgs.lib.genAttrs systems;

      # Map Nix system names to release archive target triples
      systemToTarget = {
        x86_64-linux   = "linux-x64";
        aarch64-linux  = "linux-arm64";
        x86_64-darwin  = "darwin-x64";
        aarch64-darwin = "darwin-arm64";
      };

      version = "0.9.4";

      perArchSha256 = {
        x86_64-linux   = "sha256-r03+JcF4aNImDOwkPnAt4Ihzi6i/N5livtgpY2LrDIo=";
        aarch64-linux  = "sha256-7ZZvV1KWJlvj8tghy3CmGmpf/B3v+odosZRc8L91jZA=";
        x86_64-darwin  = "sha256-bYif2qdNvxK3D8NiChD2wgyFxMFQ/+8V9CT0tq273wg=";
        aarch64-darwin = "sha256-6q+0sHGM2fvA9TLVCG8PvGjE1xglAT+m/d5akRAVX/k=";
      };
    in
    {
      packages = forAllSystems (system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
        in
        rec {
          codegraph = pkgs.stdenvNoCC.mkDerivation {
            pname = "codegraph";
            inherit version;

            src = pkgs.fetchurl {
              url = "https://github.com/colbymchenry/codegraph/releases/download/v${version}/codegraph-${systemToTarget.${system}}.tar.gz";
              hash = perArchSha256.${system};
            };

            dontBuild = true;
            dontConfigure = true;
            dontUnpack = true;

            installPhase = ''
              mkdir -p $out/libexec/codegraph $out/bin
              tar -xzf $src -C $out/libexec/codegraph --strip-components=1
              ln -s $out/libexec/codegraph/bin/codegraph $out/bin/codegraph
            '';

            meta = {
              description = "Pre-indexed code knowledge graph for AI coding assistants";
              longDescription = ''
                CodeGraph gives AI coding agents a pre-indexed knowledge graph — symbol
                relationships, call graphs, and code structure. Agents query the graph
                instantly instead of scanning files. ~35% cheaper, ~70% fewer tool calls,
                100% local. Supports Claude Code, Cursor, Codex CLI, OpenCode, and
                Hermes Agent.
              '';
              homepage = "https://github.com/colbymchenry/codegraph";
              license = nixpkgs.lib.licenses.mit;
              platforms = builtins.attrNames perArchSha256;
              maintainers = [ ];
              mainProgram = "codegraph";
            };
          };

          default = codegraph;
        }
      );
    };
}
