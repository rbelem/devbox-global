{
  description = "beads (bd) - Distributed graph issue tracker for AI agents";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs = { self, nixpkgs }:
    let
      version = "1.1.0";

      systems = [
        "x86_64-linux"
        "aarch64-linux"
        "x86_64-darwin"
        "aarch64-darwin"
      ];

      forAllSystems = f: nixpkgs.lib.genAttrs systems (system: f nixpkgs.legacyPackages.${system});

      # ── Embedded dolt runtime ─────────────────────────────────────
      # Latest dolt fetched from GitHub releases (nixpkgs lags behind).
      doltVersion = "2.0.7";
      doltPlatform = system: {
        "x86_64-linux" = {
          asset = "dolt-linux-amd64.tar.gz";
          hash = "sha256-jgkThZZ2OJbLzgYyzW53n6HfQFM0xsFIvDFFOaO5eVo=";
        };
        "aarch64-linux" = {
          asset = "dolt-linux-arm64.tar.gz";
          hash = "sha256-sPPdYHw/uYnuCNCmhU+6gNBAKXHrEI+a9hcLwU1JGjQ=";
        };
        "x86_64-darwin" = {
          asset = "dolt-darwin-amd64.tar.gz";
          hash = "sha256-sPPdYHw/uYnuCNCmhU+6gNBAKXHrEI+a9hcLwU1JGjQ=";
        };
        "aarch64-darwin" = {
          asset = "dolt-darwin-arm64.tar.gz";
          hash = "sha256-sPPdYHw/uYnuCNCmhU+6gNBAKXHrEI+a9hcLwU1JGjQ=";
        };
      }.${system} or (throw "Unsupported dolt system: ${system}");

      # Asset name + archive SHA256 (from release checksums.txt) per platform
      platform = system: {
        "x86_64-linux" = {
          asset = "beads_${version}_linux_amd64.tar.gz";
          hash = "sha256-sPPdYHw/uYnuCNCmhU+6gNBAKXHrEI+a9hcLwU1JGjQ=";
        };
        "aarch64-linux" = {
          asset = "beads_${version}_linux_arm64.tar.gz";
          hash = "sha256-5k629fmYyerj757HhvXxyQerPtBP4iDr8mXKmVLiGy8=";
        };
        "x86_64-darwin" = {
          asset = "beads_${version}_darwin_amd64.tar.gz";
          hash = "sha256-XX0w/a3PASt+DBkzpizfrvEG4lYVCbkE5QpnM2Ic+No=";
        };
        "aarch64-darwin" = {
          asset = "beads_${version}_darwin_arm64.tar.gz";
          hash = "sha256-xC4k2Dslj3up9SptLV9rBVhp3+eAcWUFWYixLn6oxWQ=";
        };
      }.${system} or (throw "Unsupported system: ${system}");

      beads-overlay = final: prev: {
        # Embedded dolt (nixpkgs lags behind — fetch latest from GitHub)
        dolt-emb = final.stdenvNoCC.mkDerivation {
          pname = "dolt";
          version = doltVersion;

          src = final.fetchurl {
            url = "https://github.com/dolthub/dolt/releases/download/v${doltVersion}/${(doltPlatform final.stdenv.hostPlatform.system).asset}";
            hash = (doltPlatform final.stdenv.hostPlatform.system).hash;
          };

          dontConfigure = true;
          dontBuild = true;

          installPhase = ''
            runHook preInstall
            mkdir -p $TMPDIR/extract
            tar -xzf $src -C $TMPDIR/extract
            # Dolt tarball has a top-level directory (dolt-linux-*) with bin/dolt inside
            find $TMPDIR/extract -name dolt -type f -exec install -Dm 755 {} $out/bin/dolt \;
            runHook postInstall
          '';

          dontFixup = true;

          meta.description = "Dolt — relational DB with version control (embedded for beads)";
        };

        beads = final.stdenv.mkDerivation {
          pname = "beads";
          inherit version;

          # fetchurl hashes the archive itself, matching release checksums.txt
          src = final.fetchurl {
            url = "https://github.com/gastownhall/beads/releases/download/v${version}/${(platform final.stdenv.hostPlatform.system).asset}";
            hash = (platform final.stdenv.hostPlatform.system).hash;
          };

          nativeBuildInputs = [ final.makeWrapper ];

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

            # Wrap so embedded dolt is on PATH at runtime
            wrapProgram $out/bin/bd --prefix PATH : ${final.dolt-emb}/bin

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
