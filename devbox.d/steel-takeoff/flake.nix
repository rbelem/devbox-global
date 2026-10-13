{
  description = "Steel takeoff toolkit - DWG/DXF parsing and AISC shapes for structure budgets";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    ezdwg-src = {
      url = "github:monozukuri-ai/ezdwg/v0.15.0";
      flake = false;
    };
    steelpy-src = {
      url = "github:evanfaler/steelpy/060dcd913a67d82ddf1b528e1739f1580161ed5b";
      flake = false;
    };
  };

  outputs = { self, nixpkgs, ezdwg-src, steelpy-src }:
    let
      supportedSystems = [
        "x86_64-linux"
        "aarch64-linux"
        "x86_64-darwin"
        "aarch64-darwin"
      ];

      forAllSystems = f: nixpkgs.lib.genAttrs supportedSystems (system: f nixpkgs.legacyPackages.${system});

      steel-overlay = final: prev: {
        python3Packages = prev.python3Packages.overrideScope (pfinal: pprev: {
          # DWG (R13-R2018 / AC1012-AC1032) reader. Rust core exposed to Python
          # via PyO3/maturin, built from the v0.15.0 tag (Cargo.lock at repo root,
          # [tool.maturin] manifest-path = crates/ezdwg-python/Cargo.toml).
          # Not in nixpkgs; upstream ships no flake.
          ezdwg = pfinal.buildPythonPackage rec {
            pname = "ezdwg";
            version = "0.15.0";
            pyproject = true;

            src = ezdwg-src;

            cargoDeps = final.rustPlatform.fetchCargoVendor {
              inherit pname version src;
              hash = "sha256-xF4gjwnhaiMum77hWMJfKdr4TnYJuaJBqDxdpQ5lPOc=";
            };

            nativeBuildInputs = [
              final.rustPlatform.cargoSetupHook
              final.rustPlatform.maturinBuildHook
            ];

            pythonImportsCheck = [ "ezdwg" ];

            # tests need the repo's real DWG fixtures and a temp home
            doCheck = false;

            meta = with final.lib; {
              description = "DWG reader with a Rust core and an ezdxf-inspired Python API";
              homepage = "https://github.com/monozukuri-ai/ezdwg";
              license = licenses.mit;
              platforms = supportedSystems;
            };
          };

          # AISC shapes database (W/M/S/HP/WT/MT/ST/Pipe/HSS/L/2L), AISC Shapes
          # Database v16.0 values. Not in nixpkgs; upstream ships no flake.
          # PyPI 1.1.1 requires pandas<3.0.0 but nixpkgs ships pandas 3.0.4;
          # the master tree (1.2.0, unreleased) dropped the pandas/openpyxl
          # dependency entirely, so build the pinned master commit instead of
          # relaxing the bound against an incompatible pandas major.
          steelpy = pfinal.buildPythonPackage rec {
            pname = "steelpy";
            version = "1.2.0";
            pyproject = true;

            src = steelpy-src;

            build-system = [ pfinal.poetry-core ];

            pythonImportsCheck = [ "steelpy" ];

            # pytest suite expects the AISC database fixtures layout; keep
            # the install-only build
            doCheck = false;

            meta = with final.lib; {
              description = "AISC steel shapes database for structural calculations";
              homepage = "https://github.com/evanfaler/steelpy";
              license = licenses.asl20;
              platforms = supportedSystems;
            };
          };
        });
      };
    in
    {
      overlays.default = steel-overlay;

      packages = forAllSystems (pkgs:
        let
          pkgsWithOverlay = pkgs.extend steel-overlay;
          py = pkgsWithOverlay.python3Packages;

          # Devbox exposes python packages to the interpreter through the
          # profile's lib/python3.14/site-packages (see PYTHONPATH in the
          # global devbox.json). A plain buildEnv over the top-level packages
          # merges their own files but NOT their propagated dependencies, so
          # imports fail on packages that were never listed (ezdxf -> pyparsing).
          # Walk the propagated closure and merge every dependency too.
          collectClosure = p: [ p ] ++ builtins.concatMap collectClosure (p.propagatedBuildInputs or [ ]);
          pythonClosure = pkgsWithOverlay.lib.unique (
            builtins.concatMap collectClosure (with py; [ ezdwg steelpy ezdxf openpyxl ])
          );
        in
        {
          ezdwg = py.ezdwg;
          steelpy = py.steelpy;
          # default = one env with the takeoff CLI tools (dwg2dxf) on PATH and
          # the full python closure importable from the merged site-packages
          default = pkgsWithOverlay.buildEnv {
            name = "steel-takeoff-env";
            paths = pythonClosure ++ [
              pkgsWithOverlay.libredwg
            ];
          };
        });

      devShells = forAllSystems (pkgs:
        let
          pkgsWithOverlay = pkgs.extend steel-overlay;
          py = pkgsWithOverlay.python3Packages;
        in
        {
          default = pkgsWithOverlay.mkShell {
            buildInputs = [
              py.ezdwg
              py.steelpy
              py.ezdxf
              py.openpyxl
              pkgsWithOverlay.libredwg
            ];
          };
        });
    };
}
