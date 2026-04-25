{
  description = "OpenCode built from source (main branch) with council fix PR#302";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };

        # Pre-built binary from source commit f7d527cd28affbd68c18e11c36799d252d88df13
        # Built with: bun install --ignore-scripts && bun ./packages/opencode/script/build.ts --single
        opencode-prebuilt = pkgs.stdenv.mkDerivation {
          pname = "opencode";
          version = "0.0.0-dev-20260425";

          src = ./opencode-binary;

          dontUnpack = true;
          dontBuild = true;
          dontStrip = true;

          installPhase = ''
            runHook preInstall
            mkdir -p $out/bin
            install -m755 $src $out/bin/opencode
            runHook postInstall
          '';

          meta = with pkgs.lib; {
            description = "OpenCode - open source AI coding agent (built from main with council fix)";
            homepage = "https://opencode.ai";
            license = licenses.mit;
            platforms = [ "x86_64-linux" ];
            mainProgram = "opencode";
          };
        };

        # Impure build from source (requires network access)
        # Usage: nix build .#from-source --impure
        opencode-from-source = pkgs.stdenv.mkDerivation {
          pname = "opencode";
          version = "0.0.0-dev";

          src = pkgs.fetchFromGitHub {
            owner = "anomalyco";
            repo = "opencode";
            rev = "f7d527cd28affbd68c18e11c36799d252d88df13";
            sha256 = "1qzjk87x83a361k7rad4xdqzg2p1sbglhb9wvy2y2qlz9m3dn8nz";
          };

          nativeBuildInputs = [ pkgs.bun ];

          __impure = true;

          buildPhase = ''
            export HOME=$TMPDIR
            bun install --ignore-scripts
            bun ./packages/opencode/script/build.ts --single
          '';

          installPhase = ''
            runHook preInstall
            mkdir -p $out/bin
            cp packages/opencode/dist/opencode-linux-x64/bin/opencode $out/bin/
            runHook postInstall
          '';

          meta = with pkgs.lib; {
            description = "OpenCode built from source";
            homepage = "https://opencode.ai";
            license = licenses.mit;
            platforms = [ "x86_64-linux" ];
            mainProgram = "opencode";
          };
        };
      in {
        packages = {
          default = opencode-prebuilt;
          opencode = opencode-prebuilt;
          from-source = opencode-from-source;
        };

        apps = {
          default = {
            type = "app";
            program = "${opencode-prebuilt}/bin/opencode";
          };
          opencode = {
            type = "app";
            program = "${opencode-prebuilt}/bin/opencode";
          };
        };
      }
    );
}
