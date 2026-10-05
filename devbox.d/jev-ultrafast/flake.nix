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
              pillow
              websockets
            ];
            doCheck = false;
          };

          # The app: jev-ultrafast @ pinned commit (no release tags upstream)
          jev-ultrafast = pfinal.buildPythonApplication rec {
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
            # browser-harness-mcp. The latter two are entry points of the
            # browser-harness dependency inside this closure; symlink them so
            # their entry-point shebangs keep browser-harness's own python env.
            postInstall = ''
              for f in browser-harness browser-harness-mcp; do
                ln -s ${pfinal."browser-harness"}/bin/$f $out/bin/$f
              done
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

        jev-ultrafast = final.python3Packages.jev-ultrafast;
      };
    in
    {
      overlays.default = jev-overlay;

      packages = forAllSystems (pkgs:
        let
          pkgsWithOverlay = pkgs.extend (jev-overlay pkgs);
        in
        {
          jev-ultrafast = pkgsWithOverlay.jev-ultrafast;
          default = pkgsWithOverlay.jev-ultrafast;
        });
    };
}
