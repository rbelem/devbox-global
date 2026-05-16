{
  description = "whichllm - Find the best local LLM that runs on your hardware";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { self, nixpkgs }: let
    supportedSystems = [ "x86_64-linux" "aarch64-linux" ];
    forAllSystems = nixpkgs.lib.genAttrs supportedSystems;

    version = "0.5.2";

    # Get the real hash:
    #   cd ~/.local/share/devbox/global/current/devbox.d/whichllm
    #   uncomment the line containing fakeHash and comment the line containing real hash
    #   run the command "devbox global update"
    # Then paste the sha256-... value below
    #
    # srcHash = pkgs.lib.fakeHash;
    srcHash = "sha256-nyOCO1KN57e1Vhm2YwOTC+Z+RM7XAf5cG6wLvLTB/yM=";
  in {
    packages = forAllSystems (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};

        # dbgpu uses setuptools (no pyproject.toml)
        dbgpu = pkgs.python312Packages.buildPythonPackage {
          pname = "dbgpu";
          version = "2025.12";
          src = pkgs.python312Packages.fetchPypi {
            pname = "dbgpu";
            version = "2025.12";
            hash = "sha256-1KL9w2/1/yrzfo/Yo+B0CrKvc8xeD9oZn9/z1vFob04=";
          };
          pyproject = true;
          build-system = [ pkgs.python312Packages.setuptools ];
          propagatedBuildInputs = with pkgs.python312Packages; [
            click
            pydantic
            thefuzz
          ];
          meta = {
            homepage = "https://github.com/painebenjamin/dbgpu";
            license = pkgs.lib.licenses.mit;
            platforms = pkgs.lib.platforms.linux;
          };
        };

      in {
        default = pkgs.python312Packages.buildPythonPackage {
          pname = "whichllm";
          inherit version;

          src = pkgs.fetchFromGitHub {
            owner = "Andyyyy64";
            repo = "whichllm";
            rev = "v${version}";
            hash = srcHash;
          };

          pyproject = true;

          nativeBuildInputs = with pkgs.python312Packages; [
            hatchling
          ];

          propagatedBuildInputs = with pkgs.python312Packages; [
            typer
            rich
            httpx
            psutil
            nvidia-ml-py
            dbgpu
          ];

          meta = {
            description = "Find the best local LLM that runs on your hardware";
            homepage = "https://github.com/Andyyyy64/whichllm";
            license = pkgs.lib.licenses.mit;
            mainProgram = "whichllm";
            platforms = pkgs.lib.platforms.linux;
          };
        };
      }
    );
  };
}
