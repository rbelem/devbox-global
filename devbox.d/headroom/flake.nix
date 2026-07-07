{
  description = "headroom - The Context Optimization Layer for LLM Applications";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { self, nixpkgs }:
    let
      supportedSystems = [ "x86_64-linux" "aarch64-linux" ];
      forAllSystems = nixpkgs.lib.genAttrs supportedSystems;

      version = "0.30.0";

      # Pre-built abi3 wheels from GitHub releases (one per arch, compatible with Python 3.10+).
      # Rebuild when version bumps: download the new wheel and get its SHA256.
      #
      #   nix store add-path --name wheel "path/to/headroom_ai-${version}-cp310-abi3-manylinux_2_28_x86_64.whl"
      #
      # Or after eval failure, read the "expected hash" from the error message.
      systemToWheel = {
        "x86_64-linux" = "headroom_ai-${version}-cp310-abi3-manylinux_2_28_x86_64.whl";
        "aarch64-linux" = "headroom_ai-${version}-cp310-abi3-manylinux_2_28_aarch64.whl";
      };

      systemToHash = {
        "x86_64-linux" = "sha256-DmajJBkBq2JgarDPKyQfMtOlrJzwy9oJn8yGUZ3RcA0=";
        "aarch64-linux" = "sha256-vQZ6Q0hbZf2NcZVu++Q+KvKoznLdaOS0juXL+tA7K5E=";
      };
    in
    {
      packages = forAllSystems (system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
          wheelName = systemToWheel.${system} or (throw "Unsupported system: ${system}");

          # ── Extras ───────────────────────────────────────────────────
          # Python dependencies covering all headroom extras available in
          # nixpkgs.  Organized by extra name so it's clear what to update
          # when adding/removing features.
          #
          # NOT in nixpkgs (skip — non-essential):
          #   anyllm → any-llm-sdk
          #   agno   → agno
          #   strands → strands-agents
          #

          # base — always installed
          baseDeps = with pkgs.python312Packages; [
            tiktoken
            pydantic
            click
            rich
            opentelemetry-api
            litellm
          ];

          # proxy — proxy server (most common install)
          proxyDeps = with pkgs.python312Packages; [
            fastapi
            uvicorn
            httpx
            openai
            mcp
            magika
            zstandard
            websockets
            onnxruntime
            transformers
            watchdog
            sqlite-vec
          ];

          # proxy-prod — production ASGI server (Unix-only)
          proxyProdDeps = with pkgs.python312Packages; [
            gunicorn
          ];

          # code — AST-aware code compression (CodeCompressor)
          codeDeps = with pkgs.python312Packages; [
            tree-sitter-language-pack
            tree-sitter
          ];

          # ml — ML compression with Kompress (ModernBERT)
          mlDeps = with pkgs.python312Packages; [
            torch
            transformers
            huggingface-hub
          ];

          # memory — hierarchical memory with vector search
          # NOTE: sentence-transformers excluded because its transitive dep
          # duckdb-engine has a flaky test (DeadlineExceeded) in nixpkgs.
          # Revisit when nixpkgs patches the test upstream.
          memoryDeps = with pkgs.python312Packages; [
            sqlite-vec
          ];

          # relevance — semantic relevance scoring
          relevanceDeps = with pkgs.python312Packages; [
            fastembed
            numpy
          ];

          # image — image compression (OCR + ML routing)
          imageDeps = with pkgs.python312Packages; [
            pillow
            sentencepiece
            onnxruntime
            rapidocr-onnxruntime
          ];

          # reports — HTML report generation
          reportsDeps = with pkgs.python312Packages; [
            jinja2
          ];

          # spreadsheet — binary spreadsheet ingestion (.xlsx / .xls)
          spreadsheetDeps = with pkgs.python312Packages; [
            openpyxl
            xlrd
          ];

          # otel — OpenTelemetry metrics export
          otelDeps = with pkgs.python312Packages; [
            opentelemetry-sdk
            opentelemetry-exporter-otlp-proto-http
          ];

          # evals — evaluation framework (GSM8K, SQuAD, BFCL)
          # NOTE: sentence-transformers excluded for same reason as memory
          # (transitive duckdb-engine flaky test in nixpkgs).
          evalsDeps = with pkgs.python312Packages; [
            datasets
            numpy
            scikit-learn
            anthropic
            openai
          ];

          # voice — voice filler detection
          voiceDeps = with pkgs.python312Packages; [
            onnxruntime
            transformers
            torch
          ];

          # html — HTML content extraction
          htmlDeps = with pkgs.python312Packages; [
            trafilatura
          ];

          # bedrock — AWS Bedrock backend
          bedrockDeps = with pkgs.python312Packages; [
            boto3
            botocore
          ];

          # langchain — LangChain integration
          langchainDeps = with pkgs.python312Packages; [
            langchain-core
            langchain-openai
          ];

          # ── Combined ──────────────────────────────────────────────────
          # Everything except benchmark (lm-eval excluded by upstream for
          # CVE reasons) and the 3 extras not in nixpkgs (anyllm, agno,
          # strands).
          allDeps = pkgs.lib.lists.unique (
            baseDeps
            ++ proxyDeps ++ proxyProdDeps
            ++ codeDeps ++ mlDeps ++ memoryDeps ++ relevanceDeps
            ++ imageDeps ++ reportsDeps ++ spreadsheetDeps
            ++ otelDeps ++ evalsDeps ++ voiceDeps ++ htmlDeps
            ++ bedrockDeps ++ langchainDeps
          );

        in
        {
          # ── Default package: headroom with ALL extras ─────────────────
          # Provides the full headroom-ai experience — CLI, proxy server,
          # ML compression, memory, MCP tools, relevance scoring, image/
          # voice processing, spreadsheets, evaluation framework, and
          # more.  Everything available in nixpkgs is included.
          default = pkgs.python312Packages.buildPythonPackage rec {
            pname = "headroom-ai";
            inherit version;

            src = pkgs.fetchurl {
              url = "https://github.com/chopratejas/headroom/releases/download/v${version}/${wheelName}";
              hash = systemToHash.${system};
            };

            format = "wheel";

            propagatedBuildInputs = allDeps;

            # ast-grep-cli is a pip-installable binary wrapper for ast-grep
            # that the base wheel lists as a dep but is not in nixpkgs as a
            # Python package.  We provide the Nix binary directly so the
            # CodeCompressor transform can find `ast-grep` on PATH.
            buildInputs = [ pkgs.ast-grep ];

            # Skip strict check for ast-grep-cli and any other wheel-declared
            # but nixpkgs-unavailable optional deps.
            dontCheckRuntimeDeps = true;

            # Tests need network access (LLM APIs, model downloads)
            doCheck = false;

            meta = with pkgs.lib; {
              description = "Compress tool outputs, logs, files, and RAG chunks before they reach the LLM. 60-95% fewer tokens, same answers.";
              longDescription = ''
                Headroom is the context optimization layer for LLM applications. It
                compresses everything your AI agent reads — tool outputs, logs, RAG
                chunks, files, and conversation history — before it reaches the LLM,
                enabling the same answers with a fraction of the tokens.

                Ships as a Python library (`from headroom import compress`), a proxy
                (`headroom proxy --port 8787`), and an agent wrapper
                (`headroom wrap claude|codex|copilot|...`).

                This package bundles ALL headroom extras available in nixpkgs:
                proxy, code, ml, memory, relevance, image, reports, spreadsheet,
                otel, evals, voice, html, bedrock, langchain, mcp.
              '';
              homepage = "https://headroom-docs.vercel.app";
              license = licenses.asl20;
              mainProgram = "headroom";
              platforms = supportedSystems;
              maintainers = [ ];
            };
          };
        }
      );
    };
}
