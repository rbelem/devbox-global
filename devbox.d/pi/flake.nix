{
  description = "pi - Terminal coding agent (prebuilt bun compile)";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { self, nixpkgs }: let
    supportedSystems = [ "x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin" ];
    forAllSystems = f: nixpkgs.lib.genAttrs supportedSystems (system: f nixpkgs.legacyPackages.${system});

    version = "0.84.2";

    # Node-style asset naming (bun build --compile).
    systemToTarget = {
      "x86_64-linux"  = "linux-x64";
      "aarch64-linux" = "linux-arm64";
      "x86_64-darwin" = "darwin-x64";
      "aarch64-darwin" = "darwin-arm64";
    };

    # Hashes from GitHub release API asset digests, converted to SRI.
    systemToHash = {
      "x86_64-linux"  = "sha256-kG++eH/SJcSsYk/n69Wx1Vpg4PXH71F5XSMVZPnuHBM=";
      "aarch64-linux" = "sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
      "x86_64-darwin" = "sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
      "aarch64-darwin" = "sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
    };
  in {
    packages = forAllSystems (pkgs: rec {
      pi = pkgs.stdenv.mkDerivation rec {
        pname = "pi";
        inherit version;

        src = pkgs.fetchurl {
          url = "https://github.com/earendil-works/pi/releases/download/v${version}/pi-${systemToTarget.${pkgs.stdenv.hostPlatform.system}}.tar.gz";
          hash = systemToHash.${pkgs.stdenv.hostPlatform.system};
        };

        # Bun-compiled binaries have embedded data that strip/patchelf corrupts.
        # The binary resolves runtime data (themes, assets, export templates)
        # relative to its own path, so those dirs must ship next to it in $out/bin.
        dontUnpack = true;
        dontStrip = true;
        dontPatchELF = true;

        installPhase = ''
          runHook preInstall
          mkdir -p $out/bin
          tar xzf $src
          install -m755 pi/pi $out/bin/pi
          cp -r pi/theme pi/assets pi/export-html $out/bin/
          # pi resolves its version from a sibling package.json (falls back to
          # 0.0.0 without it, which triggers the update nag) and CHANGELOG.md
          # for the changelog command.
          cp pi/package.json pi/CHANGELOG.md $out/bin/
          runHook postInstall
        '';

        meta = with pkgs.lib; {
          description = "Minimal terminal coding agent (AI assistant with read, bash, edit, write tools)";
          homepage = "https://github.com/earendil-works/pi";
          license = licenses.mit;
          mainProgram = "pi";
          platforms = supportedSystems;
        };
      };

      default = pi;
    });
  };
}
