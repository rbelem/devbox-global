{
  description = "openinterpreter - AI coding agent for open models (Rust rewrite, formerly Codex CLI)";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { self, nixpkgs }: let
    supportedSystems = [ "x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin" ];
    forAllSystems = f: nixpkgs.lib.genAttrs supportedSystems (system: f nixpkgs.legacyPackages.${system});

    # The upstream tag is "rust-v<X>.<Y>.<Z>" — the "rust-" prefix marks the
    # Rust rewrite (the old Python "open-interpreter" by KillianLucas was a
    # different project). Version is parsed for display/update-flake purposes;
    # the actual download URL uses the full tag.
    version = "0.0.34";
    tag = "rust-v${version}";

    # Upstream ships Rust target-triple-named .tar.gz assets.
    # Linux binaries are statically linked musl — no dynamic linker patching.
    systemToTarget = {
      "x86_64-linux"   = "x86_64-unknown-linux-musl";
      aarch64-linux    = "aarch64-unknown-linux-musl";
      "x86_64-darwin"  = "x86_64-apple-darwin";
      aarch64-darwin   = "aarch64-apple-darwin";
    };

    # Captured from the upstream codex-package_SHA256SUMS file (rust-v0.0.34),
    # converted from hex sha256 to SRI format. No fakeHash dance needed.
    systemToHash = {
      "x86_64-linux"   = "sha256-JnyKcd8CDKs63/1cyBIajlJVSfb5WpFrCT4Z4cIlK48=";
      aarch64-linux    = "sha256-FhnydFIqCLVQpXLugYaX5G8E1YysSxF3/APJM8ex4OM=";
      "x86_64-darwin"  = "sha256-HRkJ5QyTw0P1sDnOUBSYV+NyxvDbIiqNcMeK8bZ5pxU=";
      aarch64-darwin   = "sha256-ePGxjh+hzbcpONx4yfbAIEvM/OHh8Mlp+4PfZ4nb1BE=";
    };
  in {
    packages = forAllSystems (pkgs: rec {
      openinterpreter = pkgs.stdenv.mkDerivation rec {
        pname = "openinterpreter";
        inherit version;

        src = pkgs.fetchurl {
          url = "https://github.com/openinterpreter/openinterpreter/releases/download/${tag}/open-interpreter-package-${systemToTarget.${pkgs.stdenv.hostPlatform.system}}.tar.gz";
          hash = systemToHash.${pkgs.stdenv.hostPlatform.system};
        };

        dontUnpack = true;

        # The release tarball ships three binaries (interpreter, i,
        # codex-code-mode-host) plus bundled helper tools the interpreter calls
        # at runtime via relative paths:
        #   - codex-resources/bwrap  (sandbox)
        #   - codex-resources/zsh/bin/zsh
        #   - codex-path/rg          (ripgrep)
        # We install everything under $out/lib/openinterpreter/ so the
        # interpreter binary's relative-path lookup finds its siblings, then
        # symlink the CLI entry points into $out/bin.
        #
        # dontStrip / dontPatchELF: the bundled binaries ship pre-stripped and
        # Nix's fixup phase would otherwise touch the embedded interpreter
        # tables.
        dontStrip = true;
        dontPatchELF = true;

        nativeBuildInputs = [ pkgs.gnutar ];

        installPhase = ''
          runHook preInstall
          tar xzf $src

          mkdir -p $out/lib/openinterpreter $out/bin
          cp -r bin codex-resources codex-path $out/lib/openinterpreter/
          chmod -R +x $out/lib/openinterpreter/bin \
                     $out/lib/openinterpreter/codex-resources \
                     $out/lib/openinterpreter/codex-path

          ln -s $out/lib/openinterpreter/bin/interpreter           $out/bin/interpreter
          ln -s $out/lib/openinterpreter/bin/i                     $out/bin/i
          ln -s $out/lib/openinterpreter/bin/codex-code-mode-host  $out/bin/codex-code-mode-host
          runHook postInstall
        '';

        meta = with pkgs.lib; {
          description = "AI coding agent for open models like Kimi K3 (Rust rewrite)";
          longDescription = ''
            openinterpreter is a coding agent for open models. It is the Rust
            rewrite of the project formerly known as Codex CLI, distributed as
            statically-linked release tarballs with bundled helper tools
            (bwrap, ripgrep, zsh) used by the agent for sandboxing and shell
            execution.
          '';
          homepage = "https://github.com/openinterpreter/openinterpreter";
          license = licenses.asl20;
          mainProgram = "interpreter";
          platforms = supportedSystems;
        };
      };

      default = openinterpreter;
    });

    apps = forAllSystems (pkgs: {
      openinterpreter = {
        type = "app";
        program = "${self.packages.${pkgs.system}.openinterpreter}/bin/interpreter";
      };
      default = self.apps.${pkgs.system}.openinterpreter;
    });
  };
}