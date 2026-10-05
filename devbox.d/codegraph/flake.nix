{
  description = "Pre-indexed code knowledge graph for AI coding assistants (rbelem fork with Perl support)";
  # upstream: colbymchenry/codegraph
  # fork-suffix: -perl
  #
  # After bumping the version above, sync the v1.6.x-perl fork branch:
  #   cd $(ghq root)/github.com/rbelem/codegraph
  #   git fetch origin --tags
  #   git checkout v1.6.x-perl
  #   git merge v<new-version>
  #   # Resolve conflicts if any:
  #   # - CHANGELOG.md: keep upstream entries + restore Perl entry at top
  #   git push origin v1.4.x-perl

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    codegraph-src = {
      url = "github:rbelem/codegraph/v1.6.x-perl";
      flake = false;
    };
  };

  outputs = { self, nixpkgs, codegraph-src }:
    let
      systems = [ "x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin" ];
      forAllSystems = nixpkgs.lib.genAttrs systems;

      version = "1.6.2-perl";
      treeSitterPerlVersion = "1.2.0";
      treeSitterPerlOwner = "tree-sitter-perl";
      treeSitterPerlRepo = "tree-sitter-perl";
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
            # Build the server only — same surface as 1.6.0-perl, which had
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

            buildInputs = [
              (mkTreeSitterPerl pkgs)
            ];

            meta = {
              description = "Pre-indexed code knowledge graph for AI coding assistants";
              longDescription = ''
                CodeGraph gives AI coding agents a pre-indexed knowledge graph — symbol
                relationships, call graphs, and code structure. Agents query the graph
                instantly instead of scanning files. ~35% cheaper, ~70% fewer tool calls,
                100% local. Supports Claude Code, Cursor, Codex CLI, OpenCode, and
                Hermes Agent.
              '';
              homepage = "https://github.com/rbelem/codegraph";
              license = nixpkgs.lib.licenses.mit;
              platforms = systems;
              maintainers = [ ];
              mainProgram = "codegraph";
            };
          };

          default = codegraph;

          # Defined after codegraph so flake.nix file-order greps (used by update-flake)
          # find codegraph's version and homepage first.
          mkTreeSitterPerl = pkgs: pkgs.python3Packages.buildPythonPackage {
            pname = "tree-sitter-perl";
            version = treeSitterPerlVersion;
            format = "setuptools";

            src = pkgs.fetchFromGitHub {
              owner = treeSitterPerlOwner;
              repo = treeSitterPerlRepo;
              rev = "v${treeSitterPerlVersion}";
              hash = "sha256-x5rVu/GlZ5HL+8fUo1JdEftIgKDIcluuRTaQDSFBcYo=";
            };

            nativeBuildInputs = [ pkgs.tree-sitter ];

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

            build-system = [ pkgs.python3Packages.setuptools ];

            pythonImportsCheck = [ "tree_sitter_perl" ];

            meta = {
              description = "Perl grammar for tree-sitter";
              homepage = "https://github.com/tree-sitter-perl/tree-sitter-perl";
              license = nixpkgs.lib.licenses.mit;
              platforms = systems;
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
