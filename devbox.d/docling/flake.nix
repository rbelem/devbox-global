{
  description = "Docling overlay - document conversion CLI (latest from GitHub)";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    docling-src = {
      url = "github:docling-project/docling/v2.93.0";
      flake = false;
    };
  };

  outputs = { self, nixpkgs, docling-src }:
    let
      version = "2.93.0";

      supportedSystems = [
        "x86_64-linux"
        "aarch64-linux"
        "x86_64-darwin"
        "aarch64-darwin"
      ];

      forAllSystems = f: nixpkgs.lib.genAttrs supportedSystems (system: f nixpkgs.legacyPackages.${system});

      docling-overlay = final: prev: {
        docling = final.python3Packages.buildPythonApplication rec {
          pname = "docling-slim";
          inherit version;
          format = "other";

          src = docling-src;

          # The pyproject.toml and docling/ source are at the repo root
          # (monorepo: root = docling-slim, packages/docling = meta-package)
          setSourceRoot = "sourceRoot=source";

          nativeBuildInputs = with final.python3Packages; [
            hatchling
            build
            installer
          ];

          buildPhase = ''
            runHook preBuild
            python -m build --no-isolation --outdir dist/ --wheel
            runHook postBuild
          '';

          installPhase = ''
            runHook preInstall
            mkdir -p "$out"
            python -m installer --prefix "$out" dist/*.whl
            runHook postInstall
          '';

          propagatedBuildInputs = with final.python3Packages; [
            # Core deps
            pydantic
            docling-core
            pydantic-settings
            filetype
            requests
            certifi
            pluggy
            tqdm
            # CLI deps
            typer
            rich
            # convert-core deps
            numpy
            pillow
            scipy
            rtree
            # format-pdf (pypdfium2 only; docling-parse is broken in nixpkgs)
            pypdfium2
            # format-office deps
            python-docx
            python-pptx
            openpyxl
            # format-web deps
            beautifulsoup4
            lxml
            marko
            # format-latex deps
            pylatexenc
            # extract-core deps
            polyfactory
            # models deps
            torch
            torchvision
            docling-ibm-models
            accelerate
            huggingface-hub
            defusedxml
            # service-client deps
            httpx
            websockets
            # chunking deps (via docling-core[chunking])
            # typing
            typing-extensions
          ];

          # Patch imports to make docling_parse optional since
          # docling-parse is broken in nixpkgs (C++ build fails with nlohmann_json 3.12)
          postInstall = ''
            site=$out/${final.python3Packages.python.sitePackages}

            # Replace docling_parse_backend with a stub that doesn't import docling_parse
            cat > "$site/docling/backend/docling_parse_backend.py" << 'STUB'
import logging
from docling.backend.pypdfium2_backend import PyPdfiumDocumentBackend

_log = logging.getLogger(__name__)


class DoclingParseDocumentBackend(PyPdfiumDocumentBackend):
    """Stub: docling-parse not available, falling back to pypdfium2 backend."""

    pass
STUB

            # Make DoclingParseDocumentBackend import optional in CLI
            sed -i '/^from docling\.backend\.docling_parse_backend import DoclingParseDocumentBackend$/c\
try:\
    from docling.backend.docling_parse_backend import DoclingParseDocumentBackend\
except ImportError:\
    DoclingParseDocumentBackend = None' "$site/docling/cli/main.py"
          '';

          # Many transitive deps may not be in nixpkgs;
          # skip strict runtime dependency checking.
          dontCheckRuntimeDeps = true;

          # Tests require network access and model downloads
          doCheck = false;

          meta = with final.lib; {
            description = "SDK and CLI for parsing PDF, DOCX, HTML, and more to unified document representation";
            homepage = "https://github.com/docling-project/docling";
            license = licenses.mit;
            mainProgram = "docling";
            platforms = supportedSystems;
          };
        };
      };
    in
    {
      overlays.default = docling-overlay;

      packages = forAllSystems (pkgs:
        let
          pkgsWithOverlay = pkgs.extend docling-overlay;
        in
        {
          docling = pkgsWithOverlay.docling;
          default = pkgsWithOverlay.docling;
        });

      devShells = forAllSystems (pkgs:
        let
          pkgsWithOverlay = pkgs.extend docling-overlay;
        in
        {
          default = pkgsWithOverlay.mkShell {
            buildInputs = [ pkgsWithOverlay.docling ];
          };
        });
    };
}