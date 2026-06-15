{
  description = "SkillSpector - Security scanner for AI agent skills";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { self, nixpkgs }: let
    supportedSystems = [ "x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin" ];
    forAllSystems = nixpkgs.lib.genAttrs supportedSystems;

    # No version tags upstream — pinned to latest commit on main.
    version = "0-unstable-2026-06-10";
    rev = "1a7bf02";

    # Get the real hash:
    #   cd ~/.local/share/devbox/global/current/devbox.d/skillspector
    #   uncomment the line containing fakeHash and comment the line containing real hash
    #   run the command "devbox global update"
    # Then paste the sha256-... value below
    #
    srcHash = "sha256-NwkfzgKfKNC9xWoznCRfdFrytvdR+J5X7TImdjZ6Td8=";
  in {
    packages = forAllSystems (system:
      let
        pkgs = import nixpkgs {
          inherit system;
          config.allowUnfree = true;
          overlays = [
            # tzlocal V5 test fails in sandbox: timezone offset mismatch
            # (test expects UTC-4, sandbox has UTC).
            (final: prev: {
              python312 = prev.python312.override {
                packageOverrides = self: super: {
                  tzlocal = super.tzlocal.overridePythonAttrs (old: {
                    doCheck = false;
                  });
                };
              };
            })
          ];
        };
        pythonPackages = pkgs.python312Packages;
      in {
        default = pythonPackages.buildPythonApplication {
          pname = "skillspector";
          inherit version;
          format = "pyproject";

          src = pkgs.fetchFromGitHub {
            owner = "NVIDIA";
            repo = "SkillSpector";
            rev = rev;
            hash = srcHash;
          };

          nativeBuildInputs = with pythonPackages; [
            hatchling
          ];

          propagatedBuildInputs = with pythonPackages; [
            typer
            rich
            httpx
            pyyaml
            pydantic
            openai
            langgraph
            langgraph-cli
            langchain-core
            langchain-openai
            langsmith
            yara-python
          ];

          # All deps are listed above — keep this flag in case nixpkgs lags
          # behind upstream dep additions.
          dontCheckRuntimeDeps = true;

          meta = with pkgs.lib; {
            description = "Security scanner for AI agent skills — detects vulnerabilities before you install";
            homepage = "https://github.com/NVIDIA/SkillSpector";
            license = licenses.mit;
            mainProgram = "skillspector";
            platforms = platforms.unix;
          };
        };
      }
    );
  };
}
