{
  description = "graphify - AI coding assistant skill for knowledge graphs (rbelem fork with Perl support)";
  # upstream: safishamsi/graphify
  # fork-suffix: -perl
  #
  # After bumping the version above, sync the v8-perl fork branch:
  #   cd $(ghq root)/github.com/safishamsi/graphify
  #   git fetch origin --tags
  #   git checkout v8-perl
  #   git merge v<new-version>
  #   # Resolve conflicts if any:
  #   # - CHANGELOG.md: keep upstream entries + restore Perl entry at top
  #   # - pyproject.toml: keep tree-sitter-perl dep + perl extra; combine all list
  #   git push rbelem v8-perl

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    graphify-src = {
      url = "github:rbelem/graphify/v8-perl";
      flake = false;
    };
  };

  outputs = { self, nixpkgs, graphify-src }:
    let
      supportedSystems = [ "x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin" ];
      forAllSystems = f: nixpkgs.lib.genAttrs supportedSystems (system: f nixpkgs.legacyPackages.${system});

      # tree-sitter-perl is defined inline (after graphify) because relative-path
      # flake inputs don't work when devbox evaluates from nix store paths.
      treeSitterPerlVersion = "1.1.1";
      # Use variables to avoid matching update-flake's fetchFromGitHub detection
      # (which greps for these attribute patterns as string literals).
      treeSitterPerlOwner = "ganezdragon";
      treeSitterPerlRepo = "tree-sitter-perl";
    in
    {
      packages = forAllSystems (pkgs:
        let
          # Use Python 3.12 to match system default `python` so `python -m graphify` works.
          pythonPackages = pkgs.python312Packages;
        in rec {
        graphify = pythonPackages.buildPythonApplication rec {
          pname = "graphifyy";
          version = "0.8.38-perl";
          format = "pyproject";

          src = graphify-src;

          nativeBuildInputs = with pythonPackages; [
            setuptools
            wheel
          ];

          # Remove setuptools-scm: it derives version from git tags, but our
          # fork branch has upstream tags that produce a different version
          # than what pyproject.toml declares. Without it, setuptools uses
          # pyproject.toml's version field directly.

          propagatedBuildInputs = with pythonPackages; [
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
            (mkTreeSitterPerl pkgs)
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

        # Defined after graphify so flake.nix file-order greps (used by update-flake)
        # find graphify's version and homepage first.
        mkTreeSitterPerl = pkgs: pythonPackages.buildPythonPackage {
          pname = "tree-sitter-perl";
          version = treeSitterPerlVersion;
          format = "setuptools";

          src = pkgs.fetchFromGitHub {
            owner = treeSitterPerlOwner;
            repo = treeSitterPerlRepo;
            rev = "v${treeSitterPerlVersion}";
            hash = "sha256-1RnL1dFbTWalqIYg8oGNzwvZxOFPPKwj86Rc3ErfYMU=";
          };

          # GitHub source doesn't ship Python bindings (generated at release via cibuildwheel).
          # Generate minimal binding that compiles parser + scanner into _binding.abi3.so.
          preBuild = ''
            rm -f setup.py pyproject.toml
            mkdir -p tree_sitter_perl

            cat > tree_sitter_perl/__init__.py << 'PYEOF'
            """Perl grammar for tree-sitter."""
            from ._binding import language
            PYEOF

            cat > binding.c << 'CEOF'
            #include <Python.h>

            typedef struct TSLanguage TSLanguage;
            TSLanguage *tree_sitter_perl(void);

            static PyObject *_language(PyObject *self, PyObject *args) {
                return PyCapsule_New(tree_sitter_perl(), "tree_sitter.LANGUAGE", NULL);
            }

            static PyMethodDef _methods[] = {
                {"language", _language, METH_NOARGS, "Get the tree-sitter language for this grammar."},
                {NULL, NULL, 0, NULL}
            };

            static struct PyModuleDef _module = {
                PyModuleDef_HEAD_INIT, "_binding", NULL, -1, _methods
            };

            PyMODINIT_FUNC PyInit__binding(void) {
                return PyModule_Create(&_module);
            }
            CEOF

            cat > setup.py << 'SETUPEOF'
            from setuptools import Extension, setup
            setup(
                name="tree-sitter-perl",
                version="${treeSitterPerlVersion}",
                packages=["tree_sitter_perl"],
                ext_package="tree_sitter_perl",
                ext_modules=[
                    Extension(
                        name="_binding",
                        sources=["binding.c", "src/parser.c", "src/scanner.c"],
                        include_dirs=["src"],
                        define_macros=[("Py_LIMITED_API", "0x030A0000")],
                        py_limited_api=True,
                    )
                ],
            )
            SETUPEOF
          '';

          build-system = [ pythonPackages.setuptools ];

          pythonImportsCheck = [ "tree_sitter_perl" ];

          meta = {
            description = "Perl grammar for tree-sitter";
            homepage = "https://github.com/ganezdragon/tree-sitter-perl";
            license = nixpkgs.lib.licenses.mit;
            platforms = supportedSystems;
          };
        };
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
            python312
            python312Packages.pip
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
