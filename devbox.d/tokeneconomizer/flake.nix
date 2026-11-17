{
  description = "tokeneconomizer - Experience-driven black-box cost control for coding agents";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs =
    { self, nixpkgs }:
    let
      supportedSystems = [
        "x86_64-linux"
        "aarch64-linux"
        "x86_64-darwin"
        "aarch64-darwin"
      ];
      forAllSystems =
        f: nixpkgs.lib.genAttrs supportedSystems (system: f nixpkgs.legacyPackages.${system});

      # release-prefix: v
      version = "0.1.0";

      # Get the real hash:
      #   cd ~/.local/share/devbox/global/current/devbox.d/tokeneconomizer
      #   uncomment the line containing fakeHash and comment the line containing real hash
      #   run the command "devbox global update"
      # Then paste the sha256-... value below
      #
      srcHash = "sha256-FgcR1EvK7hyH/E9YwI9oFu65/RWMbInVQlA3lzE8DTE=";
    in
    {
      packages = forAllSystems (
        pkgs:
        let
          pythonPackages = pkgs.python3Packages;
        in
        rec {
          tokeneconomizer = pythonPackages.buildPythonApplication {
            pname = "tokeneconomizer";
            inherit version;

            src = pkgs.fetchFromGitHub {
              owner = "microsoft";
              repo = "tokeneconomizer";
              rev = "v${version}";
              #hash = pkgs.lib.fakeHash;
              hash = srcHash;
            };

            pyproject = true;

            # The package is stdlib-only by design: the three mechanisms, the
            # trace reader, the ledger and the plugin runtime import nothing
            # outside the standard library.
            nativeBuildInputs = with pythonPackages; [
              setuptools
            ];

            # Tests are offline (no Docker / no datasets) but the suite
            # imports the experiments/ harness, which is deliberately not
            # distributed; keep them off for the package build.
            doCheck = false;

            meta = with pkgs.lib; {
              description = "Experience-driven black-box cost control for coding agents (Claude Code, Codex, Copilot CLI, Pi)";
              homepage = "https://github.com/microsoft/tokeneconomizer";
              license = licenses.asl20;
              mainProgram = "te";
              platforms = supportedSystems;
            };
          };

          default = tokeneconomizer;
        }
      );

      apps = forAllSystems (pkgs: {
        tokeneconomizer = {
          type = "app";
          program = "${self.packages.${pkgs.system}.tokeneconomizer}/bin/te";
        };
        default = self.apps.${pkgs.system}.tokeneconomizer;
      });
    };
}
