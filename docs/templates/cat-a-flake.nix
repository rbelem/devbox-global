{
  # Category-A template: prebuilt binary release fetched via fetchurl.
  # Copy this file to devbox.d/<NAME>/flake.nix, then replace every <...>
  # placeholder. Modeled on devbox.d/{herdr,pi,firecrawl}/flake.nix.
  description = "<NAME> - <ONE-LINE-DESCRIPTION>";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { self, nixpkgs }: let
    supportedSystems = [ "x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin" ];
    forAllSystems = f: nixpkgs.lib.genAttrs supportedSystems (system: f nixpkgs.legacyPackages.${system});

    # === CHANGE PER BUMP: version string ===
    version = "<VERSION>"; # e.g. "1.2.3" (no leading v; the v lives in the URL)

    # === CHANGE PER BUMP: asset name per system (must match upstream release assets) ===
    systemToTarget = {
      "x86_64-linux"  = "<ASSET-PATTERN>"; # e.g. "<NAME>-linux-x64.tar.gz"
      "aarch64-linux" = "<ASSET-PATTERN>";
      "x86_64-darwin" = "<ASSET-PATTERN>";
      "aarch64-darwin" = "<ASSET-PATTERN>";
    };

    # === CHANGE PER BUMP: one SRI hash per system (nix hash to-sri) ===
    # RULE: literal "sha256-..." strings ONLY here. This map is OUTSIDE pkgs
    # scope, so pkgs.lib.fakeHash does NOT evaluate. To refresh a hash, put a
    # dummy literal (e.g. "sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="),
    # build, and paste the "got:" hash from the error.
    systemToHash = {
      "x86_64-linux"  = "<SRI-HASH-x86_64-linux>";
      "aarch64-linux" = "<SRI-HASH-aarch64-linux>";
      "x86_64-darwin" = "<SRI-HASH-x86_64-darwin>";
      "aarch64-darwin" = "<SRI-HASH-aarch64-darwin>";
    };
  in {
    packages = forAllSystems (pkgs: rec {
      <NAME> = pkgs.stdenv.mkDerivation rec {
        pname = "<NAME>";
        inherit version;

        src = pkgs.fetchurl {
          # === CHANGE PER BUMP: URL-embedded version/tag layout ===
          url = "https://github.com/<OWNER>/<REPO>/releases/download/v${version}/${systemToTarget.${pkgs.stdenv.hostPlatform.system}}";
          hash = systemToHash.${pkgs.stdenv.hostPlatform.system};
        };

        dontUnpack = true;
        # Uncomment next two lines for bun-compiled binaries (strip/patchelf corrupts them):
        # dontStrip = true;
        # dontPatchELF = true;

        installPhase = ''
          runHook preInstall
          mkdir -p $out/bin
          tar xzf $src # tarball; raw binary: install -m755 $src $out/bin/<NAME>
          runHook postInstall
        '';

        meta = with pkgs.lib; {
          description = "<ONE-LINE-DESCRIPTION>";
          homepage = "https://github.com/<OWNER>/<REPO>";
          license = licenses.<LICENSE>; # e.g. mit, asl20, isc
          mainProgram = "<NAME>";
          platforms = supportedSystems;
        };
      };

      default = <NAME>;
    });

    apps = forAllSystems (pkgs: {
      <NAME> = {
        type = "app";
        program = "${self.packages.${pkgs.system}.<NAME>}/bin/<NAME>";
      };
      default = self.apps.${pkgs.system}.<NAME>;
    });
  };
}
