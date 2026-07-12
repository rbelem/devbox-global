{
  description = "Docling overlay - document conversion CLI (latest from GitHub)";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    docling-src = {
      url = "github:docling-project/docling/v2.111.0";
      flake = false;
    };
    docling-core-src = {
      url = "github:docling-project/docling-core/v2.87.0";
      flake = false;
    };
    doclang-src = {
      url = "github:doclang-project/doclang/v0.7.2";
      flake = false;
    };
  };

  outputs = { self, nixpkgs, docling-src, docling-core-src, doclang-src }:
    let
      version = "2.111.0";

      supportedSystems = [
        "x86_64-linux"
        "aarch64-linux"
        "x86_64-darwin"
        "aarch64-darwin"
      ];

      forAllSystems = f: nixpkgs.lib.genAttrs supportedSystems (system: f nixpkgs.legacyPackages.${system});

      docling-overlay = final: prev: {
        # Extend python3Packages so docling's `with final.python3Packages;
        # docling-core` picks up our overridden versions, not nixpkgs' 2.73.0.
        python3Packages = prev.python3Packages.overrideScope (pfinal: pprev: {
          # Override doclang to v0.7.2 (not in nixpkgs)
          doclang = pfinal.buildPythonPackage rec {
            pname = "doclang";
            version = "0.7.2";
            format = "pyproject";
            src = doclang-src;
            build-system = [ pfinal.setuptools ];
            dependencies = with pfinal; [ lxml typer ];
            doCheck = false;
          };

          # Override docling-core to v2.87.0 (nixpkgs has 2.73.0, too old)
          docling-core = pfinal.buildPythonPackage rec {
            pname = "docling-core";
            version = "2.87.0";
            format = "pyproject";
            src = docling-core-src;
            build-system = with pfinal; [ poetry-core setuptools ];
            pythonRelaxDeps = [ "defusedxml" "pydantic-settings" ];
            dependencies = with pfinal; [
              defusedxml
              jsonref
              jsonschema
              latex2mathml
              pandas
              pillow
              pydantic
              pydantic-settings
              pyyaml
              semchunk
              tabulate
              tree-sitter
              transformers
              typer
              typing-extensions
              pfinal.doclang  # use our overridden doclang
            ];
            doCheck = false;
          };
        });

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
            # format-email deps
            mail-parser
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
            # OCR deps (RapidOCR)
            rapidocr
            onnxruntime
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


class ThreadedDoclingParseDocumentBackend(PyPdfiumDocumentBackend):
    """Stub: docling-parse not available, falling back to pypdfium2 backend."""

    pass
STUB

            # Make DoclingParseDocumentBackend import optional in CLI
            sed -i '/^from docling\.backend\.docling_parse_backend import ($/,/^)$/c\
try:\
    from docling.backend.docling_parse_backend import (\
        DoclingParseDocumentBackend,\
        ThreadedDoclingParseDocumentBackend,\
    )\
except ImportError:\
    DoclingParseDocumentBackend = None\
    ThreadedDoclingParseDocumentBackend = None' "$site/docling/cli/main.py"
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