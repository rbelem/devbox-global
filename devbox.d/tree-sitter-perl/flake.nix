{
  description = "tree-sitter-perl - Perl grammar for tree-sitter (Python package)";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { self, nixpkgs }:
    let
      systems = [ "x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin" ];
      forAllSystems = nixpkgs.lib.genAttrs systems;

      version = "1.1.2";
    in
    {
      packages = forAllSystems (system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
        in
        rec {
          tree-sitter-perl = pkgs.python3Packages.buildPythonPackage {
            pname = "tree-sitter-perl";
            inherit version;
            format = "setuptools";

            src = pkgs.fetchFromGitHub {
              owner = "tree-sitter-perl";
              repo = "tree-sitter-perl";
              rev = "v${version}";
              hash = "sha256-n61EnZszV6odNssETF3SsY2f7ShHog5msNX5Ds8Ietk=";
            };

            # The tag source doesn't include generated parser.c or Python bindings.
            # We generate parser.c from grammar.json, then produce a minimal Python
            # package that compiles the grammar C source into a tree-sitter-compatible
            # _binding.so with a language() capsule.
            preBuild = ''
              tree-sitter generate src/grammar.json
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
                  version="${version}",
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

            nativeBuildInputs = [ pkgs.tree-sitter ];

            build-system = [ pkgs.python3Packages.setuptools ];

            pythonImportsCheck = [ "tree_sitter_perl" ];

            meta = {
              description = "Perl grammar for tree-sitter";
              homepage = "https://github.com/tree-sitter-perl/tree-sitter-perl";
              license = nixpkgs.lib.licenses.mit;
              platforms = systems;
            };
          };

          default = tree-sitter-perl;
        }
      );
    };
}
