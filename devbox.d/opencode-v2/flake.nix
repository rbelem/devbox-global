{
  description = "opencode v2 (opencode2) - rewritten TUI/CLI, beta, npm-only distribution";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { self, nixpkgs }: let
    supportedSystems = [ "x86_64-linux" ];
    forAllSystems = f: nixpkgs.lib.genAttrs supportedSystems (system: f nixpkgs.legacyPackages.${system});

    # v2 is beta and distributed only via npm platform packages (no standalone
    # release assets). The tarball contains a single precompiled Bun standalone
    # binary at package/bin/opencode2. We use the -baseline variant (no AVX/AVX2)
    # for VirtualBox compat, same as the bun and v1 opencode story.
    #
    # Hash capture workflow:
    #   1. nix-prefetch-url <tarball url>
    #   2. nix hash convert --hash-algo sha256 --to sri <base32>
    version = "0.0.0-next-17055";

    tarballUrl = "https://registry.npmjs.org/@opencode-ai/cli-linux-x64-baseline/-/cli-linux-x64-baseline-${version}.tgz";
    tarballHash = "sha256-8E8dH82CVB4ltfw21+34/KyWlLEfhp8ZwR/2C9w7hjU=";
  in {
    packages = forAllSystems (pkgs: rec {
      opencode-v2 = pkgs.stdenv.mkDerivation {
        pname = "opencode2";
        inherit version;

        src = pkgs.fetchurl {
          url = tarballUrl;
          hash = tarballHash;
        };

        dontUnpack = true;

        installPhase = ''
          runHook preInstall
          mkdir -p $out/bin
          tar -xzf $src
          install -m755 package/bin/opencode2 $out/bin/opencode2
          runHook postInstall
        '';

        meta = with pkgs.lib; {
          description = "opencode v2 - AI coding agent TUI (beta, rewritten)";
          homepage = "https://opencode.ai/v2/docs";
          license = licenses.mit;
          mainProgram = "opencode2";
          platforms = supportedSystems;
        };
      };

      default = opencode-v2;
    });

    apps = forAllSystems (pkgs: {
      opencode2 = {
        type = "app";
        program = "${self.packages.${pkgs.system}.opencode-v2}/bin/opencode2";
      };
      default = self.apps.${pkgs.system}.opencode2;
    });
  };
}