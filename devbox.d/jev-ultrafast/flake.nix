{
  description = "jev-ultrafast - Browser agent that picks operations instead of generating (TypeSafe Jev)";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { self, nixpkgs }:
    let
      supportedSystems = [ "x86_64-linux" ];
      forAllSystems = f: nixpkgs.lib.genAttrs supportedSystems (system: f nixpkgs.legacyPackages.${system});

      jev-overlay = pkgs: final: prev: {
        python3Packages = prev.python3Packages.overrideScope (pfinal: pprev: {
          # nixpkgs has 16.x; browser-harness pins websockets==15.0.1
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

          # Not in nixpkgs (from uv.lock / PyPI)
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

          # mcp 2.x pair (mcp==mcp-types exact pin): nixpkgs has mcp 1.29.0.
          # Pure-Python wheels via fetchurl — upstream sdists need hatchling +
          # uv-dynamic-versioning, and fetchPypi's wheel format hardcodes a
          # py2.py3 tag that doesn't match these py3 wheels. Same recipes as
          # devbox.d/browser-harness. Keeps the symlinked browser-harness-mcp
          # entry point actually working inside this closure.
          mcp-types = pfinal.buildPythonPackage rec {
            pname = "mcp-types";
            version = "2.1.1";
            format = "wheel";
            src = pkgs.fetchurl {
              url = "https://files.pythonhosted.org/packages/71/d0/242e63c510f4a17381f55b1549a3f94f5687a0595984febd2b6f87a687a0/mcp_types-2.1.1-py3-none-any.whl";
              hash = "sha256-Jvn38D8qVzBxeluY4qt+tkCsNS0FoAzcclwxGGR3gpU=";
            };
            dependencies = with pfinal; [
              pydantic
            ];
            doCheck = false;
          };

          mcp = pfinal.buildPythonPackage rec {
            pname = "mcp";
            version = "2.1.1";
            format = "wheel";
            src = pkgs.fetchurl {
              url = "https://files.pythonhosted.org/packages/50/af/8644cc5fa26a59afd2df2e98eeb19e72926887fa4b7441aba4ff661140db/mcp-2.1.1-py3-none-any.whl";
              hash = "sha256-HGwxxdZHHFjbdq86+K9n9G0R0B8KWQd9CjCMvbPT6RU=";
            };
            # pyjwt[crypto] = pyjwt + cryptography; dep floors verified against
            # nixpkgs python3Packages (3.14) in devbox.d/browser-harness.
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

          # Not in nixpkgs; provides `browser-harness` and `browser-harness-mcp`
          # console scripts via its own [project.scripts]
          browser-harness = pfinal.buildPythonPackage rec {
            pname = "browser-harness";
            version = "0.1.13";
            pyproject = true;
            src = pfinal.fetchPypi {
              pname = "browser_harness";
              inherit version;
              hash = "sha256-KE3FR6BCwwn+r9mp9KdLKoZRt5Y+o6xssvLWSIn2qPM=";
            };
            build-system = [ pfinal.setuptools ];
            # Upstream pins build setuptools==84.0.0 exactly; nixpkgs ships
            # 83.0.0. Build with it anyway via --skip-dependency-check.
            pypaBuildFlags = [ "--skip-dependency-check" ];
            dependencies = with pfinal; [
              cdp-use
              fetch-use
              mcp
              pillow
              websockets
            ];
            doCheck = false;
          };

          # The app: jev-ultrafast @ pinned commit (no release tags upstream)
          jev-ultrafast =
            let
              # Daemon-safe entry-point shims, same construction as
              # devbox.d/browser-harness. jev-ultrafast owns the profile's
              # `browser-harness` bin name (devbox bin collision; decided by
              # lock install order, not devbox.json order), so the staged
              # entry points must serve the PYTHONPATH shims: the bare
              # console scripts wire the closure via in-process
              # site.addsitedir, and admin.py ensure_daemon spawns daemon
              # children with bare `sys.executable` — ModuleNotFoundError
              # under any env without an inherited PYTHONPATH.
              bh-pyenv = pkgs.python3.withPackages (
                ps: [ (ps.toPythonModule pfinal.browser-harness) ]
              );
              bh-shim = name: module: pkgs.writeScriptBin name ''
                #!${pkgs.bash}/bin/bash
                export PYTHONPATH="${bh-pyenv}/${pkgs.python3.sitePackages}"
                exec "${pkgs.python3}/bin/python3.14" -c 'import sys; from ${module} import main; sys.exit(main())' "$@"
              '';
            in
            pfinal.buildPythonApplication rec {
              pname = "jev-ultrafast";
              version = "0.1.0";
              pyproject = true;

              src = pkgs.fetchFromGitHub {
                owner = "browser-use";
                repo = "jev-ultrafast";
                rev = "1231850a0bf1a0c0341fe408ef1668dbbfdfac46";
                hash = "sha256-8EJhsOjalxX6uUCu+bREqopVUBG8O64SehhQUdNUwVI=";
              };

              build-system = [ pfinal.hatchling ];
              # httpx[http2] = httpx + h2 (h2 pulls hyperframe)
              dependencies = with pfinal; [
                browser-harness
                httpx
                h2
              ];

              doCheck = false;

              # Chart contract: one package bin stages jev + browser-harness +
              # browser-harness-mcp. The latter two are the daemon-safe shims
              # over this closure's browser-harness (bh-shim above).
              postInstall = ''
                mkdir -p $out/bin
                ln -s ${bh-shim "browser-harness" "browser_harness.run"}/bin/browser-harness $out/bin/browser-harness
                ln -s ${bh-shim "browser-harness-mcp" "browser_harness.mcp_cli"}/bin/browser-harness-mcp $out/bin/browser-harness-mcp
              '';

              meta = with final.lib; {
                description = "Browser agent that picks operations instead of generating (TypeSafe Jev)";
                homepage = "https://github.com/browser-use/jev-ultrafast";
                license = licenses.mit;
                mainProgram = "jev";
                platforms = supportedSystems;
              };
            };
        });

        inherit (final.python3Packages) jev-ultrafast;
      };
    in
    {
      overlays.default = jev-overlay;

      packages = forAllSystems (pkgs:
        let
          pkgsWithOverlay = pkgs.extend (jev-overlay pkgs);
        in
        {
          inherit (pkgsWithOverlay) jev-ultrafast;
          default = pkgsWithOverlay.jev-ultrafast;
        });
    };
}
