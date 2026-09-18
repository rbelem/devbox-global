{
  description = "jev-review - Jev-powered continuous software-quality review MCP server";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { self, nixpkgs }: let
    supportedSystems = [ "x86_64-linux" "aarch64-linux" ];
    forAllSystems = nixpkgs.lib.genAttrs supportedSystems;

    # rbelem fork: adds the OpenRouter Decisions API provider fallback
    # (upstream NiazMorshed2007/jev-review is TypeSafe-direct only).
    version = "0.1.1-p1";
    rev = "7879ca94a4d4f1afd1410fb2a81dfd569b0faff3";

    # Get the real hash:
    #   nix flake prefetch github:rbelem/jev-review/<rev>
    # and paste the reported 'sha256-...' below.
    srcHash = "sha256-lyZm4P1SaZ0PQOi2Lpbj8MFWNsX/cKfOQivSd7zZ9aw=";
  in {
    packages = forAllSystems (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};

        jev-review = pkgs.stdenv.mkDerivation {
          pname = "jev-review";
          inherit version;

          src = pkgs.fetchFromGitHub {
            owner = "rbelem";
            repo = "jev-review";
            inherit rev;
            hash = srcHash;
          };

          # dist/server.js is committed and fully bundled by esbuild,
          # so there is nothing to build - just install it with a node wrapper.
          dontBuild = true;
          nativeBuildInputs = [ pkgs.makeWrapper ];

          installPhase = ''
            runHook preInstall
            install -Dm644 dist/server.js $out/lib/jev-review/server.js
            makeWrapper ${pkgs.nodejs_22}/bin/node $out/bin/jev-review \
              --add-flags "$out/lib/jev-review/server.js"
            runHook postInstall
          '';

          meta = {
            description = "Jev-powered continuous software-quality review MCP server";
            homepage = "https://github.com/rbelem/jev-review";
            license = pkgs.lib.licenses.mit;
            platforms = pkgs.lib.platforms.linux;
          };
        };
      in {
        default = jev-review;
      });
  };
}
