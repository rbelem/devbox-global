{
  description = "LiteLLM proxy server — 100+ provider gateway with latency-based routing";

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

          version = "1.95.0rc2";

          litellmPkg = pkgs.python3Packages.litellm;
        in
        {
          # Override nixpkgs litellm (1.89.0) with latest RC from PyPI.
          # Also adds proxy deps (fastapi, uvicorn, pyyaml, mcp, etc.) which
          # the base nixpkgs package excludes.
          #
          # To bump: check https://github.com/BerriAI/litellm/releases for latest,
          # then update `version` and `hash` (run:
          #   curl -sL https://files.pythonhosted.org/packages/source/l/litellm/litellm-<ver>.tar.gz \
          #   | sha256sum | cut -d' ' -f1 | nix hash to-sri --type sha256).
          default = litellmPkg.overridePythonAttrs (old: {
            inherit version;
            src = pkgs.fetchPypi {
              pname = "litellm";
              inherit version;
              hash = "sha256-6kOE6clUe6e5R6ZfVbwZzs02KT/JG+fZMQEyDIHZDEQ=";
            };
            dependencies = (old.dependencies or [ ])
              ++ litellmPkg.passthru.optional-dependencies.proxy;
          });
        }
      );
    };
}
