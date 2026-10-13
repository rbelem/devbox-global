{
  description = "Pre-indexed code knowledge graph for AI coding assistants";
  # upstream: colbymchenry/codegraph (no fork; the old rbelem -perl fork is
  # retired — upstream has no Perl extraction, so Perl files are skipped)

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    codegraph-src = {
      url = "github:colbymchenry/codegraph/v1.6.2";
      flake = false;
    };
  };

  outputs = { self, nixpkgs, codegraph-src }:
    let
      systems = [ "x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin" ];
      forAllSystems = nixpkgs.lib.genAttrs systems;

      version = "1.6.2";
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
            npmDepsHash = "sha256-J8viY38M/loCoJmpxEOIApN6cpf6sU2aa80knVNRSvI=";

            nodejs = pkgs.nodejs_22;

            # Upstream v1.6.2 added a ui/ Svelte+Vite workspace and the root
            # `build` script now runs build:ui, which fails deterministically
            # (vite-plugin-svelte load-custom TypeError) with pinned deps.
            # Build the server only — same surface as 1.6.0, which had
            # no ui/ at all. `codegraph ui` viewer will 404 until upstream
            # fixes their ui build; CLI indexing is unaffected.
            buildPhase = ''
              runHook preBuild
              npx tsc
              npm run copy-assets
              node -e "require('fs').chmodSync('dist/bin/codegraph.js', 0o755)"
              runHook postBuild
            '';

            # Drop the ui/ workspace symlink after install: ui/ isn't shipped
            # (see above) and the server never imports
            # @colbymchenry/codegraph-ui, so leaving it would fail fixup
            # with a dangling-symlink error. (npm prune recreates it, so
            # this must run in postInstall, not buildPhase.)
            postInstall = ''
              rm -rf "$out/lib/node_modules/@colbymchenry/codegraph/node_modules/@colbymchenry/codegraph-ui"
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
