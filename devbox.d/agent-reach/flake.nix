{
  description = "agent-reach - Give your AI Agent eyes to see the entire internet";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { self, nixpkgs }: let
    supportedSystems = [ "x86_64-linux" "aarch64-linux" ];
    forAllSystems = nixpkgs.lib.genAttrs supportedSystems;

    version = "1.5.0";

    # Get the real hash:
    #   cd ~/.local/share/devbox/global/current/devbox.d/agent-reach
    #   1. Set srcHash to pkgs.lib.fakeHash
    #   2. Run: devbox global update
    #   3. Replace with the sha256-... from the error message
    #
    srcHash = "sha256-rCEtsGDa+CzEGavRPKDtjy1SNrUGdrgtq+iWkOaQbIQ=";
  in {
    packages = forAllSystems (system:
      let
        pkgs = import nixpkgs {
          inherit system;
          config.allowUnfree = true;
        };
        pythonPackages = pkgs.python3Packages;
      in {
        default = pythonPackages.buildPythonApplication {
          pname = "agent-reach";
          inherit version;
          format = "pyproject";

          src = pkgs.fetchFromGitHub {
            owner = "Panniantong";
            repo = "Agent-Reach";
            rev = "v${version}";
            hash = srcHash;
          };

          nativeBuildInputs = with pythonPackages; [
            hatchling
          ];

          propagatedBuildInputs = with pythonPackages; [
            requests
            feedparser
            python-dotenv
            loguru
            pyyaml
            rich
            yt-dlp
          ];

          # Optional deps (not included by default):
          #   playwright     → browser automation (browser extra)
          #   browser-cookie3 → cookie extraction (cookies extra)
          #   mcp[cli]       → MCP integration (all extra)

          dontCheckRuntimeDeps = true;
          doCheck = false;

          meta = with pkgs.lib; {
            description = "Give your AI Agent eyes to see the entire internet. Search + Read 10+ platforms.";
            homepage = "https://github.com/Panniantong/agent-reach";
            license = licenses.mit;
            mainProgram = "agent-reach";
            platforms = platforms.linux;
          };
        };
      }
    );
  };
}
