{
  description = "firecrawl - Firecrawl CLI";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { self, nixpkgs }: let
    supportedSystems = [ "x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin" ];
    forAllSystems = f: nixpkgs.lib.genAttrs supportedSystems (system: f nixpkgs.legacyPackages.${system});

    version = "1.26.18";

    # Node.js ecosystem naming: <os>-<arch>
    systemToTarget = {
      "x86_64-linux"   = "linux-x64";
      "aarch64-linux"  = "linux-arm64";
      "x86_64-darwin"  = "darwin-x64";
      "aarch64-darwin" = "darwin-arm64";
    };

    # No SHA256SUMS published; hashes computed per-asset via sha256sum + nix hash to-sri.
    systemToHash = {
      "x86_64-linux"   = "sha256-n54Fs4m7Epz/aYoxreLU26NvdVC5RzzPb/LEhhFizPU=";
      "aarch64-linux"  = "sha256-EwfdWmNRUT2mJLffkJ1/oQ1cGFkM8ouGxnlLz9RFH5A=";
      "x86_64-darwin"  = "sha256-Wilapnc+piKS1oYRi1bC1VjJk6EnKP2HG89Y1xkzzKA=";
      "aarch64-darwin" = "sha256-u0xqPrMolJ5W49580l6obUSsZQ1T+BVuiNbvbs0ZVPs=";
    };
  in {
    packages = forAllSystems (pkgs: rec {
      firecrawl = pkgs.stdenv.mkDerivation rec {
        pname = "firecrawl";
        inherit version;

        src = pkgs.fetchurl {
          url = "https://github.com/firecrawl/cli/releases/download/v${version}/firecrawl-${systemToTarget.${pkgs.stdenv.hostPlatform.system}}.tar.gz";
          hash = systemToHash.${pkgs.stdenv.hostPlatform.system};
        };

        dontUnpack = true;

        # Bun-compiled binaries (`bun build --compile`) embed JS bytecode/data
        # inside the ELF. Nix's fixup phase runs `strip` + `patchelf`, which
        # mangles the embedded bun data and leaves the binary showing bun
        # runtime help instead of the app's CLI.
        dontStrip = true;
        dontPatchELF = true;

        installPhase = ''
          runHook preInstall
          mkdir -p $out/bin
          tar xzf $src
          install -m755 firecrawl-${systemToTarget.${pkgs.stdenv.hostPlatform.system}} $out/bin/firecrawl
          runHook postInstall
        '';

        meta = with pkgs.lib; {
          description = "Firecrawl CLI - turn websites into AI-ready datasets";
          homepage = "https://github.com/firecrawl/cli";
          license = licenses.isc;
          mainProgram = "firecrawl";
          platforms = supportedSystems;
        };
      };

      default = firecrawl;
    });

    apps = forAllSystems (pkgs: {
      firecrawl = {
        type = "app";
        program = "${self.packages.${pkgs.system}.firecrawl}/bin/firecrawl";
      };
      default = self.apps.${pkgs.system}.firecrawl;
    });
  };
}
