{
  description = "graphify - AI coding assistant skill for knowledge graphs (rbelem fork with Perl support)";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    graphify-src = {
      url = "github:rbelem/graphify/v6-perl";
      flake = false;
    };
  };

  outputs = { self, nixpkgs, graphify-src }: let
    supportedSystems = [ "x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin" ];
    forAllSystems = f: nixpkgs.lib.genAttrs supportedSystems (system: f nixpkgs.legacyPackages.${system});
  in {
    packages = forAllSystems (pkgs: rec {
      graphify = pkgs.python3Packages.buildPythonApplication rec {
        pname = "graphifyy";
        version = "0.6.7-perl";
        format = "pyproject";

        src = graphify-src;

        nativeBuildInputs = with pkgs.python3Packages; [
          setuptools
          setuptools-scm
          wheel
        ];

        propagatedBuildInputs = with pkgs.python3Packages; [
          networkx
          numpy
          pyyaml
          requests
          pydantic
          tree-sitter
          tree-sitter-python
          tree-sitter-javascript
          tree-sitter-rust
          tree-sitter-c-sharp
          # tree-sitter-perl is not in nixpkgs;
          # install via pip into the venv after graphify is installed.
        ];

        # Many tree-sitter grammars are not packaged in nixpkgs;
        # graphifyy installs/builds missing ones on first run.
        dontCheckRuntimeDeps = true;

        meta = with pkgs.lib; {
          description = "Turn any folder into a queryable knowledge graph (with Perl support)";
          homepage = "https://github.com/rbelem/graphify";
          license = licenses.mit;
          mainProgram = "graphify";
        };
      };

      default = graphify;
    });

    apps = forAllSystems (pkgs: {
      graphify = {
        type = "app";
        program = "${self.packages.${pkgs.system}.graphify}/bin/graphify";
      };
      default = self.apps.${pkgs.system}.graphify;
    });

    devShells = forAllSystems (pkgs: {
      default = pkgs.mkShell {
        packages = with pkgs; [
          uv
          python3
          python3Packages.pip
        ];
        shellHook = ''
          echo "graphify dev shell (rbelem/v5-perl fork)"
          echo "Quick install: uv pip install -e ."
          echo "Or: pip install -e ."
        '';
      };
    });
  };
}
