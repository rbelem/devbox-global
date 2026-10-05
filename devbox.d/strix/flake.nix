{
  description = "strix - Open-source AI pentesting tool (built from PR #1284)";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

    pyproject-nix.url = "github:pyproject-nix/pyproject.nix";

    uv2nix = {
      url = "github:pyproject-nix/uv2nix";
      inputs.pyproject-nix.follows = "pyproject-nix";
      inputs.nixpkgs.follows = "nixpkgs";
    };

    pyproject-build-systems = {
      url = "github:pyproject-nix/build-system-pkgs";
      inputs.pyproject-nix.follows = "pyproject-nix";
      inputs.nixpkgs.follows = "nixpkgs";
    };

    # strix at the head commit of PR usestrix/strix#1284 (podman runtime backend)
    strix-src = {
      url = "github:usestrix/strix/22713380652255624ba9340d4ab60a1518e3c9aa";
      flake = false;
    };
  };

  outputs = { self, nixpkgs, pyproject-nix, uv2nix, pyproject-build-systems, strix-src }: let
    supportedSystems = [ "x86_64-linux" ];
    forAllSystems = f: nixpkgs.lib.genAttrs supportedSystems (system: f nixpkgs.legacyPackages.${system});

    version = "1.7.0";
  in {
    packages = forAllSystems (pkgs: let
      python = pkgs.python314;

      # Go Bubble Tea TUI sidecar, built separately so the wheel build
      # does not need Go or network access inside the nix sandbox.
      tuiSidecar = pkgs.buildGoModule {
        pname = "strix-tui";
        inherit version;
        src = "${strix-src}/strix/interface/tui";
        # module github.com/usestrix/strix/tui, go 1.24.0
        vendorHash = "sha256-MeLL85C4OSdGwVkJrW4QEiZSZx9nXrmI1TJMAyak2A0=";
      };

      workspace = uv2nix.lib.workspace.loadWorkspace { workspaceRoot = strix-src; };

      overlay = workspace.mkPyprojectOverlay { sourcePreference = "wheel"; };

      pyprojectOverrides = _final: prev: {
        strix-agent = prev.strix-agent.overrideAttrs (old: {
          # Remove the hatchling custom hook that compiles the Go TUI sidecar
          # (it needs Go + network and would fail in the sandbox).
          postPatch = (old.postPatch or "") + ''
            sed -i '/^\[tool\.hatch\.build\.targets\.wheel\.hooks\.custom\]$/,+1d' pyproject.toml
            # The PR branch was cut before the 1.7.0 version bump; pin the
            # version so the built package reports the flake's version.
            substituteInPlace pyproject.toml --replace-fail 'version = "1.6.2"' 'version = "${version}"'
          '';
          # Ship the prebuilt sidecar inside the wheel.
          preBuild = (old.preBuild or "") + ''
            mkdir -p strix/bin
            cp ${tuiSidecar}/bin/strix-tui strix/bin/
          '';
        });
      };

      pythonSet = (pkgs.callPackage pyproject-nix.build.packages { python = python; }).overrideScope (nixpkgs.lib.composeManyExtensions [
        overlay
        pyproject-build-systems.overlays.default
        pyprojectOverrides
      ]);
    in rec {
      strix = (pythonSet.mkVirtualEnv "strix-env" workspace.deps.default).overrideAttrs (old: {
        meta = (old.meta or { }) // {
          description = "Open-source AI pentesting tool (built from PR #1284)";
          homepage = "https://github.com/usestrix/strix";
          license = pkgs.lib.licenses.asl20;
          mainProgram = "strix";
          platforms = supportedSystems;
        };
      });

      default = strix;
    });

    apps = forAllSystems (pkgs: {
      strix = {
        type = "app";
        program = "${self.packages.${pkgs.system}.strix}/bin/strix";
      };
      default = self.apps.${pkgs.system}.strix;
    });
  };
}
