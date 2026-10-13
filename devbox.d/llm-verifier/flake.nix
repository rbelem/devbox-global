{
  description = "llm-verifier - LLM-as-a-Verifier: fine-grained verification framework for agent best-of-N selection";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { self, nixpkgs }:
    let
      supportedSystems = [ "x86_64-linux" "aarch64-linux" ];
      forAllSystems = nixpkgs.lib.genAttrs supportedSystems;

      version = "0.3.0";

      # Get the real hash:
      #   set this to pkgs.lib.fakeHash, run "devbox global update",
      #   then paste the sha256-... value from the (multiple) error messages.
      srcHash = "sha256-DiIpF8aoApKZVjjuVd0WRloc1+W91cZns4pJY2bmiNs=";
    in {
      packages = forAllSystems (system:
        let
          pkgs = nixpkgs.legacyPackages.${system};

          llm-verifier = pkgs.python3Packages.buildPythonPackage {
            pname = "llm-verifier";
            inherit version;

            # fetchurl instead of fetchPypi: PyPI's sdist is PEP-625
            # normalized (llm_verifier-*.tar.gz, underscore) while
            # fetchPypi's pname builds a hyphenated URL → 404.
            src = pkgs.fetchurl {
              url = "https://files.pythonhosted.org/packages/54/3a/451be3bc6c1f3120b2137e9551938dca132432ce66d1fe6400c13920580e/llm_verifier-${version}.tar.gz";
              hash = srcHash;
            };

            pyproject = true;

            nativeBuildInputs = with pkgs.python3Packages; [
              setuptools
            ];

            propagatedBuildInputs = with pkgs.python3Packages; [
              google-genai
              openai
              tqdm
            ];

            # vllm extra deliberately skipped: self-hosting the verifier model
            # needs a GPU. Use DEEPSEEK_API_KEY / VERTEX_API_KEY or any
            # OpenAI-compatible endpoint returning logprobs instead.
            pythonImportsCheck = [ "llm_verifier" ];

            meta = {
              description = "LLM-as-a-Verifier: general-purpose verification framework for agents";
              homepage = "https://github.com/llm-as-a-verifier/llm-as-a-verifier";
              license = pkgs.lib.licenses.mit;
              platforms = pkgs.lib.platforms.linux;
            };
          };

          # Library-only (no CLI): expose via withPackages so the whole dep
          # closure (openai/google-genai/tqdm) lands in one site-packages,
          # matching devbox.json's PYTHONPATH to lib/python3.14/site-packages.
        in {
          default = pkgs.python3.withPackages (ps: [ llm-verifier ]);
        });
    };
}
