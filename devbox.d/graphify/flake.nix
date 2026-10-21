{
  description = "graphify - AI coding assistant skill for knowledge graphs";
  # upstream: safishamsi/graphify (no fork; the old rbelem v9-perl fork is
  # retired — upstream has no Perl grammar, so Perl files are skipped)

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    graphify-src = {
      url = "github:safishamsi/graphify/v0.9.93";
      flake = false;
    };
  };

  outputs = { self, nixpkgs, graphify-src }:
    let
      supportedSystems = [ "x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin" ];
      forAllSystems = f: nixpkgs.lib.genAttrs supportedSystems (system: f nixpkgs.legacyPackages.${system});
    in
    {
      packages = forAllSystems (pkgs:
        let
          # inline-snapshot 0.32.5 has 3 broken tests in nixpkgs
          # (snapshot value mismatch in sandbox env); skip them.
          pythonPackages = pkgs.python3Packages.overrideScope (final: prev: {
            inline-snapshot = prev.inline-snapshot.overridePythonAttrs (old: {
              doCheck = false;
            });
          });
          runtimeDeps = with pythonPackages; [
            networkx
            numpy
            rapidfuzz
            pyyaml
            requests
            pydantic
            tree-sitter
            tree-sitter-python
            tree-sitter-javascript
            tree-sitter-typescript
            tree-sitter-rust
            tree-sitter-c-sharp
            # Required for the gemini semantic backend
            openai
            tiktoken
          ];
        in rec {
        graphify = pythonPackages.buildPythonApplication rec {
          pname = "graphify";
          version = "0.9.93";
          format = "pyproject";

          src = graphify-src;

          nativeBuildInputs = with pythonPackages; [
            setuptools
            wheel
          ];

          # Remove setuptools-scm: it derives version from git tags, but GitHub
          # tarball sources have no git metadata, so setuptools falls back to
          # pyproject.toml's version field directly.

          propagatedBuildInputs = runtimeDeps;

          # Many tree-sitter grammars (go, java, ruby, c, cpp, kotlin, scala,
          # php, swift, lua, zig, powershell, groovy) are not packaged in
          # nixpkgs; graphifyy handles their absence per-language at runtime.
          dontCheckRuntimeDeps = true;

          # graphify re-execs itself as `[sys.executable, "-m", "graphify"]`
          # (PYTHONHASHSEED pinning, __main__._pin_hashseed) for update /
          # extract / cluster-only / label. The nixpkgs wrapper bootstraps
          # dependency site-packages via site.addsitedir, which does NOT
          # survive os.execvpe — the child python imports graphify from
          # scratch and crashes with "No module named 'tree_sitter'".
          # Export PYTHONPATH so child interpreters see the same modules.
          makeWrapperArgs = [
            "--prefix" "PYTHONPATH" ":" (pkgs.lib.makeSearchPath pythonPackages.python.sitePackages runtimeDeps)
          ];

          meta = with pkgs.lib; {
            description = "Turn any folder into a queryable knowledge graph";
            homepage = "https://github.com/safishamsi/graphify";
            license = licenses.asl20;
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
            echo "graphify dev shell"
            echo "Quick install: uv pip install -e ."
            echo "Or: pip install -e ."
          '';
        };
      });
    };
}
