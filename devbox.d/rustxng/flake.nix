{
  description = "rustxng - self-hosted metasearch engine for AI agents, SearXNG-compatible (Rust)";

  # upstream: sahenjp/RustXNG (no fork)

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs =
    { self, nixpkgs }:
    let
      # Release line v<version>. v0.26.0 ships Linux x86_64 (gnu and musl) plus
      # darwin x86_64/aarch64 assets; aarch64-linux only lands in a later
      # release, and the darwin binaries are unverified here. Package the one
      # target this machine runs; add the others with a signing check when
      # something actually runs them.
      systems = [ "x86_64-linux" ];
      forAllSystems = f: nixpkgs.lib.genAttrs systems (s: f nixpkgs.legacyPackages.${s});

      version = "0.30.0";
      # Upstream publishes a .sha256 sidecar next to every release asset; this
      # is that sidecar for the musl asset, converted with `nix hash to-sri`.
      srcHash = "sha256-cYyl6fdDQKAWsytuN1S+wGJfYXy9G18HYpffGqh2LrI=";
    in
    {
      packages = forAllSystems (pkgs: rec {
        # The prebuilt static binary, not a source build: RustXNG is a Rust
        # binary with no native runtime deps of its own, and building it here
        # would add a cargo toolchain and a long compile for an artifact
        # upstream already ships and checksums.
        rustxng = pkgs.stdenv.mkDerivation {
          pname = "rustxng";
          inherit version;

          src = pkgs.fetchurl {
            url = "https://github.com/sahenjp/RustXNG/releases/download/v${version}/rustxng-v${version}-x86_64-unknown-linux-musl";
            hash = srcHash;
          };

          dontUnpack = true;
          # Static musl ELF: there is no interpreter for patchelf to rewrite,
          # and upstream already strips the release.
          dontPatchELF = true;
          dontStrip = true;

          installPhase = ''
            runHook preInstall
            install -Dm755 $src $out/bin/rustxng
            runHook postInstall
          '';

          meta = with pkgs.lib; {
            description = "Self-hosted metasearch and grounding engine for AI agents (SearXNG-compatible JSON API)";
            longDescription = ''
              RustXNG is a metasearch engine written in Rust, compatible with
              SearXNG's query syntax, parameters and JSON response shape. It
              aggregates results from many engines, can fetch page text for
              grounding, and serves an MCP server alongside the HTTP API.
            '';
            homepage = "https://github.com/sahenjp/RustXNG";
            license = licenses.agpl3Plus;
            mainProgram = "rustxng";
            platforms = systems;
          };
        };

        default = rustxng;
      });

      apps = forAllSystems (pkgs: {
        rustxng = {
          type = "app";
          program = "${self.packages.${pkgs.system}.rustxng}/bin/rustxng";
        };
        default = self.apps.${pkgs.system}.rustxng;
      });
    };
}
