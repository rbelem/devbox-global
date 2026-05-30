{
  description = "See where your AI coding tokens go - by task, tool, model, and project";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
  };

  outputs = { self, nixpkgs }:
    let
      version = "0.9.11";
      systems = [ "x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin" ];
      forAllSystems = nixpkgs.lib.genAttrs systems;
    in
    {
      packages = forAllSystems (system:
        let
          pkgs = nixpkgs.legacyPackages.${system};

          # The build script fetches litellm pricing data from the network.
          # Nix sandbox blocks network access, so we pre-fetch it here.
          # Update the hash when rebuilding: nix build will show the expected hash.
          litellmPrices = pkgs.fetchurl {
            url = "https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json";
            #hash = pkgs.lib.fakeHash;
            hash = "sha256-zJa6H2EwP9s+hMVs78Y+hwo4UX1dHRtvX5J3MdGh5aI=";
          };
        in
        {
          default = pkgs.buildNpmPackage rec {
            inherit version;
            pname = "codeburn";

            src = pkgs.fetchFromGitHub {
              owner = "getagentseal";
              repo = "codeburn";
              rev = "v${version}";
              #hash = pkgs.lib.fakeHash;
              hash = "sha256-LbaN2fID/ucYjLebKlknh081hdP+h0VpP5Ex8rV1DUs=";
            };

            # Run `nix build` once and replace with the hash from the error message
            #npmDepsHash = pkgs.lib.fakeHash;
            npmDepsHash = "sha256-Q/z7Pc5Rb1tQ7Fscugb8/qEzxWI2/UCb2OA20N/2Y24=";

            nodejs = pkgs.nodejs_22;

            # Pre-process litellm pricing data and skip the network-fetching build step
            preBuild = ''
              mkdir -p src/data
              node -e "
                const fs = require('fs');
                const raw = JSON.parse(fs.readFileSync('${litellmPrices}', 'utf8'));
                const snapshot = {};
                const entries = Object.entries(raw).filter(([k]) => k !== 'sample_spec');
                function toVal(e) {
                  if (e.input_cost_per_token == null || e.output_cost_per_token == null) return null;
                  return [e.input_cost_per_token, e.output_cost_per_token, e.cache_creation_input_token_cost ?? null, e.cache_read_input_token_cost ?? null];
                }
                for (const [n, e] of entries) {
                  if (n.includes('/')) continue;
                  const v = toVal(e);
                  if (v) snapshot[n] = v;
                }
                for (const [n, e] of entries) {
                  if (!n.includes('/')) continue;
                  const v = toVal(e);
                  if (!v) continue;
                  if (!snapshot[n]) snapshot[n] = v;
                  const s = n.replace(/^[^/]+\//, '''');
                  if (s !== n && !snapshot[s]) snapshot[s] = v;
                }
                snapshot['MiniMax-M2.7'] = [0.3e-6, 1.2e-6, 0.375e-6, 0.06e-6];
                snapshot['MiniMax-M2.7-highspeed'] = [0.6e-6, 2.4e-6, 0.375e-6, 0.06e-6];
                fs.writeFileSync('src/data/litellm-snapshot.json', JSON.stringify(snapshot));
              "
            '';

            # Skip the bundle-litellm step (data already provided above), just run tsup
            buildPhase = ''
              npx tsup
            '';

            # No native build inputs needed — codeburn uses Node.js built-in
            # node:sqlite (not better-sqlite3) for Cursor/OpenCode support

            meta = with nixpkgs.lib; {
              description = "See where your AI coding tokens go - by task, tool, model, and project";
              homepage = "https://github.com/getagentseal/codeburn";
              license = licenses.mit;
              platforms = platforms.unix;
              mainProgram = "codeburn";
            };
          };
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
