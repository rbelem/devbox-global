{
  description = "SkillSpector - Security scanner for AI agent skills";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { self, nixpkgs }: let
    supportedSystems = [ "x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin" ];
    forAllSystems = nixpkgs.lib.genAttrs supportedSystems;

    # Tracking tagged releases — bump rev + version + srcHash together.
    version = "2.11.0";
    rev = "v${version}";

    # Get the real hash:
    #   cd ~/.local/share/devbox/global/current/devbox.d/skillspector
    #   uncomment the line containing fakeHash and comment the line containing real hash
    #   run the command "devbox global update"
    # Then paste the sha256-... value below
    #
    srcHash = "sha256-THpMxb4zv10YJyUPTj8Xx48iCgjvb/sfOh8qMlZuYYE=";
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
              python3 = prev.python3.override {
                packageOverrides = self: super: {
                  tzlocal = super.tzlocal.overridePythonAttrs (old: {
                    doCheck = false;
                  });
                  # inline-snapshot 0.32.5 has 3 broken tests in nixpkgs
                  # (snapshot value mismatch in sandbox env).
                  inline-snapshot = super.inline-snapshot.overridePythonAttrs (old: {
                    doCheck = false;
                  });
                };
              };
            })
          ];
        };
        pythonPackages = pkgs.python3Packages;

        # New in upstream 2.11.0 (pyproject dependencies) — not in nixpkgs.
        # hatch-vcs derives version from git; pin it for the sdist build.
        pywhatwgurl = pythonPackages.buildPythonPackage rec {
          pname = "pywhatwgurl";
          version = "0.1.1";
          pyproject = true;

          src = pkgs.fetchurl {
            url = "https://files.pythonhosted.org/packages/c0/d2/ce0fffb9eb66ea2f88d20d7c3841b017d25559b6b617bce566811fe0bb48/pywhatwgurl-0.1.1.tar.gz";
            hash = "sha256-Zchdo1NnURwSpN2H/srwiqOuVkJZBVs3tK5TQpKJ/PY=";
          };

          nativeBuildInputs = with pythonPackages; [
            hatchling
            hatch-vcs
          ];

          propagatedBuildInputs = [ pythonPackages.idna ];

          env.SETUPTOOLS_SCM_PRETEND_VERSION = version;
          env.SETUPTOOLS_SCM_PRETEND_VERSION_FOR_HATCH_VCS = version;

          doCheck = false;
        };
      in {
        default = pythonPackages.buildPythonApplication {
          pname = "skillspector";
          inherit version;
          format = "pyproject";

          nativeBuildInputs = with pythonPackages; [
            hatchling
          ];

          src = pkgs.fetchFromGitHub {
            owner = "NVIDIA";
            repo = "SkillSpector";
            rev = rev;
            hash = srcHash;
          };

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
            langchain-anthropic
            langsmith
            yara-python
            regex
            pywhatwgurl
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
