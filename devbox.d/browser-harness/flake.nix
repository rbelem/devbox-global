{
  description = "browser-harness - self-healing CDP harness that lets LLM agents control your real browser";

  # Recipe provenance: websockets/cdp-use/fetch-use/browser-harness derivations
  # mirror devbox.d/jev-ultrafast's internal closure (same pins, same hashes).
  # This flake is the standalone variant. Both closures now ship the mcp extra
  # (mcp 2.1.1 + mcp-types 2.1.1), so browser-harness-mcp works whichever one
  # wins the devbox profile collision. If browser-harness bumps, update both
  # flakes or extract a shared one.
  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { self, nixpkgs }:
    let
      version = "0.1.13";

      supportedSystems = [
        "x86_64-linux"
        "aarch64-linux"
        "x86_64-darwin"
        "aarch64-darwin"
      ];

      forAllSystems = f: nixpkgs.lib.genAttrs supportedSystems (system: f nixpkgs.legacyPackages.${system});

      browser-harness-overlay = final: prev: {
        python3Packages = prev.python3Packages.overrideScope (pfinal: pprev: {
          # browser-harness pins websockets==15.0.1; nixpkgs ships 16.x.
          # (Recipe proven in devbox.d/jev-ultrafast.)
          websockets = pfinal.buildPythonPackage rec {
            pname = "websockets";
            version = "15.0.1";
            pyproject = true;
            src = pfinal.fetchPypi {
              inherit pname version;
              hash = "sha256-glRN4CB2uvugOM4FXuZBLWjaE6tH8MYMq4JzRt6Cje4=";
            };
            build-system = [ pfinal.setuptools ];
            doCheck = false;
          };

          # Not in nixpkgs (PyPI sdist)
          cdp-use = pfinal.buildPythonPackage rec {
            pname = "cdp-use";
            version = "1.4.5";
            pyproject = true;
            src = pfinal.fetchPypi {
              pname = "cdp_use";
              inherit version;
              hash = "sha256-DaOjLfRjNqA/9aIrxrxELNfS8tUKEY/UhW8p039tJqA=";
            };
            build-system = [ pfinal.hatchling ];
            dependencies = with pfinal; [
              httpx
              typing-extensions
              websockets
            ];
            doCheck = false;
          };

          # Not in nixpkgs; no runtime deps
          fetch-use = pfinal.buildPythonPackage rec {
            pname = "fetch-use";
            version = "0.4.0";
            pyproject = true;
            src = pfinal.fetchPypi {
              pname = "fetch_use";
              inherit version;
              hash = "sha256-lRGYfUkH7G2sUB4h1mlG0QCY9mtdIbwqukGJzYG6GJo=";
            };
            build-system = [ pfinal.hatchling ];
            doCheck = false;
          };

          # Not in nixpkgs; mcp 2.x wire types (mcp==mcp-types exact pair pin).
          # Pure-Python wheel: upstream sdists need hatchling + uv-dynamic-versioning.
          # fetchurl with the exact PyPI URL — fetchPypi's wheel format
          # hardcodes a py2.py3 tag that doesn't match these py3 wheels.
          mcp-types = pfinal.buildPythonPackage rec {
            pname = "mcp-types";
            version = "2.1.1";
            format = "wheel";
            src = final.fetchurl {
              url = "https://files.pythonhosted.org/packages/71/d0/242e63c510f4a17381f55b1549a3f94f5687a0595984febd2b6f87a687a0/mcp_types-2.1.1-py3-none-any.whl";
              hash = "sha256-Jvn38D8qVzBxeluY4qt+tkCsNS0FoAzcclwxGGR3gpU=";
            };
            dependencies = with pfinal; [
              pydantic
            ];
            doCheck = false;
          };

          # nixpkgs has mcp 1.29.0; browser-harness pins mcp==2.1.1 (mcp extra).
          # Pure-Python wheel for the same uv-dynamic-versioning reason.
          # Dep floors checked against nixpkgs python3Packages (3.14):
          # anyio 4.14.2, httpx2 2.9.1, jsonschema 4.26.0, opentelemetry-api 1.43.0,
          # pydantic 2.13.4, pyjwt 2.14.0, python-multipart 0.0.32,
          # sse-starlette 3.2.0, starlette 1.3.1, uvicorn 0.51.0 — all satisfied.
          mcp = pfinal.buildPythonPackage rec {
            pname = "mcp";
            version = "2.1.1";
            format = "wheel";
            src = final.fetchurl {
              url = "https://files.pythonhosted.org/packages/50/af/8644cc5fa26a59afd2df2e98eeb19e72926887fa4b7441aba4ff661140db/mcp-2.1.1-py3-none-any.whl";
              hash = "sha256-HGwxxdZHHFjbdq86+K9n9G0R0B8KWQd9CjCMvbPT6RU=";
            };
            # pyjwt[crypto] = pyjwt + cryptography
            dependencies = with pfinal; [
              anyio
              cryptography
              httpx2
              jsonschema
              mcp-types
              opentelemetry-api
              pydantic
              pyjwt
              python-multipart
              sse-starlette
              starlette
              typing-extensions
              typing-inspection
              uvicorn
            ];
            pythonImportsCheck = [ "mcp" "mcp_types" ];
            doCheck = false;
          };

          # The app; provides both console scripts:
          #   browser-harness      (browser_harness.run:main)
          #   browser-harness-mcp  (browser_harness.mcp_cli:main)
          browser-harness = pfinal.buildPythonApplication rec {
            pname = "browser-harness";
            inherit version;
            pyproject = true;
            src = pfinal.fetchPypi {
              pname = "browser_harness";
              inherit version;
              hash = "sha256-KE3FR6BCwwn+r9mp9KdLKoZRt5Y+o6xssvLWSIn2qPM=";
            };
            build-system = [ pfinal.setuptools ];
            # Upstream pins build setuptools==84.0.0 exactly; nixpkgs ships
            # 83.x. Build with it anyway via --skip-dependency-check.
            pypaBuildFlags = [ "--skip-dependency-check" ];
            dependencies = with pfinal; [
              cdp-use
              fetch-use
              mcp
              pillow
              websockets
            ];
            pythonImportsCheck = [ "browser_harness" ];
            doCheck = false;

            meta = with final.lib; {
              description = "Self-healing CDP harness that lets LLM agents control your real browser";
              homepage = "https://github.com/browser-use/browser-harness";
              license = licenses.mit;
              mainProgram = "browser-harness";
              platforms = supportedSystems;
            };
          };
        });

        browser-harness = final.python3Packages.browser-harness;
      };
    in
    {
      overlays.default = browser-harness-overlay;

      packages = forAllSystems (pkgs:
        let
          pkgsWithOverlay = pkgs.extend browser-harness-overlay;

          # Entry-point shims against a merged python env. The
          # buildPythonApplication wrappers wire the closure via in-process
          # site.addsitedir, so `sys.executable -m browser_harness.daemon`
          # (admin.py ensure_daemon) cannot import the package: the child
          # gets a bare interpreter. With the merged env as the interpreter,
          # sys.executable itself sees the full closure under any
          # environment. Keep `browser-harness` (the python app attr)
          # untouched — jev-ultrafast depends on it for the library.
          pyenv = pkgsWithOverlay.python3.withPackages (
            ps: [ (ps.toPythonModule pkgsWithOverlay.browser-harness) ]
          );

          shim = name: module: pkgsWithOverlay.writeScriptBin name ''
            #!${pyenv}/bin/python3.14
            import sys
            from ${module} import main
            sys.exit(main())
          '';

          browser-harness-wrapped = pkgsWithOverlay.runCommand "browser-harness-bin" { } ''
            mkdir -p $out/bin
            ln -s ${shim "browser-harness" "browser_harness.run"}/bin/browser-harness $out/bin/browser-harness
            ln -s ${shim "browser-harness-mcp" "browser_harness.mcp_cli"}/bin/browser-harness-mcp $out/bin/browser-harness-mcp
          '';
        in
        {
          inherit (pkgsWithOverlay) browser-harness;
          inherit browser-harness-wrapped;
          default = browser-harness-wrapped;
        });
    };
}
