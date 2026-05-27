{
  description = "beads (bd) - Distributed graph issue tracker for AI agents";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs = { self, nixpkgs }:
    let
      version = "1.0.4";

      systems = [
        "x86_64-linux"
        "aarch64-linux"
        "x86_64-darwin"
        "aarch64-darwin"
      ];

      forAllSystems = f: nixpkgs.lib.genAttrs systems (system: f nixpkgs.legacyPackages.${system});

      # Asset name + archive SHA256 (from release checksums.txt) per platform
      platform = system: {
        "x86_64-linux" = {
          asset = "beads_${version}_linux_amd64.tar.gz";
          hash = "sha256-ZD5gLif2Zshyar/w8iAB4rWIOYj6lgIEveIKMSnUSKU=";
        };
        "aarch64-linux" = {
          asset = "beads_${version}_linux_arm64.tar.gz";
          hash = "sha256-SM31cc2LZLroHagpwTCeQCvBLmpMxrh2Bt/JIgt+zmA=";
        };
        "x86_64-darwin" = {
          asset = "beads_${version}_darwin_amd64.tar.gz";
          hash = "sha256-ilL35U/gONNpzJ6g5l92hTt19UaccMnGk9ZGcWI8TOk=";
        };
        "aarch64-darwin" = {
          asset = "beads_${version}_darwin_arm64.tar.gz";
          hash = "sha256-DFNHn+oHChyr6Osx44JNdMVkOx3spxpf6DLr046e+Hc=";
        };
      }.${system} or (throw "Unsupported system: ${system}");

      beads-overlay = final: prev: {
        beads = final.stdenv.mkDerivation {
          pname = "beads";
          inherit version;

          # fetchurl hashes the archive itself, matching release checksums.txt
          src = final.fetchurl {
            url = "https://github.com/gastownhall/beads/releases/download/v${version}/${(platform final.stdenv.hostPlatform.system).asset}";
            hash = (platform final.stdenv.hostPlatform.system).hash;
          };

          dontUnpack = true;
          dontConfigure = true;
          dontBuild = true;

          installPhase = ''
            runHook preInstall

            # Extract to temp, then install just the binary
            mkdir -p $TMPDIR/extract
            tar xzf "$src" -C $TMPDIR/extract
            install -Dm 755 $TMPDIR/extract/bd "$out/bin/bd"
            ln -s bd "$out/bin/beads"

            runHook postInstall
          '';

          meta = {
            description = "Distributed graph issue tracker for AI agents";
            homepage = "https://github.com/gastownhall/beads";
            license = final.lib.licenses.mit;
            mainProgram = "bd";
            platforms = systems;
          };
        };
      };
    in
    {
      overlays.default = beads-overlay;

      packages = forAllSystems (pkgs:
        let
          pkgsWithOverlay = pkgs.extend beads-overlay;
        in
        {
          beads = pkgsWithOverlay.beads;
          default = pkgsWithOverlay.beads;
        });

      devShells = forAllSystems (pkgs:
        let
          pkgsWithOverlay = pkgs.extend beads-overlay;
        in
        {
          default = pkgsWithOverlay.mkShell {
            buildInputs = [ pkgsWithOverlay.beads ];
          };
        });
    };
}
