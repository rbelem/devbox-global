{
  description = "OmniRoute - Unified AI router with 160+ providers, auto fallback, MCP/A2A";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs = { self, nixpkgs }:
    let
      systems = [ "x86_64-linux" ];
      forAllSystems = nixpkgs.lib.genAttrs systems;
    in
    {
      packages = forAllSystems (system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
          version = "3.8.46";

          # Get the real hashes:
          #   1. Set srcHash to pkgs.lib.fakeHash or comment out
          #   2. Run: nix build .#default
          #   3. It will fail for srcHash first — copy the "got" hash
          #   4. Then it will fail for npmDepsHash — copy that too
          srcHash = "sha256-XQ8C1C3xLgWCIPeaH/dkrbdKBjyooBr/X75BUvuqSAU=";
          npmDepsHash = "sha256-NoYZbB/cDRjtHLDqFX+/opoyNkJYwyzGyJiVF7SZozQ=";

          src = pkgs.fetchFromGitHub {
            owner = "diegosouzapw";
            repo = "OmniRoute";
            rev = "v${version}";
            hash = srcHash;
          };
        in
        {
          default = pkgs.buildNpmPackage rec {
            pname = "omniroute";
            inherit version src npmDepsHash;

            nativeBuildInputs = with pkgs; [
              python3
              pkg-config
              nodejs_22
            ];

            buildInputs = with pkgs; [
              glib
              nss
              libsecret
            ];

            dontNpmBuild = true;

            npmFlags = [ "--ignore-scripts" ];

            installPhase = ''
              runHook preInstall

              # Copy the package to $out
              mkdir -p $out/lib/node_modules/omniroute
              cp -r . $out/lib/node_modules/omniroute/

              # Create bin wrappers
              mkdir -p $out/bin
              for bin in omniroute omniroute-reset-password; do
                makeWrapper ${pkgs.nodejs_22}/bin/node \
                  $out/bin/$bin \
                  --add-flags "$out/lib/node_modules/omniroute/bin/$bin.mjs" \
                  --set NODE_PATH "$out/lib/node_modules"
              done

              runHook postInstall
            '';

            meta = with pkgs.lib; {
              description = "Unified AI router with 160+ providers, RTK+Caveman compression, auto fallback, MCP/A2A";
              homepage = "https://github.com/diegosouzapw/OmniRoute";
              license = licenses.mit;
              mainProgram = "omniroute";
              platforms = systems;
            };
          };
        }
      );
    };
}
