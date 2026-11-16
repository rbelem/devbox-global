{
  description = "kitesurf - terminal CDP client for Cloudflare's experimental browser engine";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs =
    { self, nixpkgs }:
    let
      # x86_64-linux only until someone verifies aarch64-linux or darwin.
      systems = [ "x86_64-linux" ];
      forAllSystems = nixpkgs.lib.genAttrs systems;

      # Release line: upstream tags plain calver (2026.11.9), no prefix and no
      # GitHub releases; the tags are the only source of versions.
      version = "2026.11.9";

      # Hash capture workflow:
      #   1. set srcHash to pkgs.lib.fakeHash
      #   2. nix build "path:devbox.d/kitesurf#default"
      #   3. paste the sha256-... value from the error message
      srcHash = "sha256-GIJuGlLqycvWp8bMmNX/QtE9JVpmwSaNDmY0hyLJvJY=";
    in
    {
      packages = forAllSystems (
        system:
        let
          pkgs = nixpkgs.legacyPackages.${system};

          src = pkgs.fetchFromGitHub {
            owner = "cloudflare";
            repo = "kitesurf";
            rev = version;
            hash = srcHash;
          };
        in
        {
          # The shippable artifact in the monorepo is the kitesurf terminal
          # client: a standalone Rust workspace with its own lockfile that
          # talks CDP to a Kitesurf engine (kitesurf.dev playground, Browser
          # Run, or KITESURF_SERVER) and renders pages in the terminal.
          # The engine itself is a Cloudflare Worker and is not packaged.
          default = pkgs.rustPlatform.buildRustPackage {
            pname = "kitesurf";
            inherit version src;

            cargoLock.lockFile = "${src}/packages/kitesurf-cli/Cargo.lock";
            cargoRoot = "packages/kitesurf-cli";
            buildAndTestSubdir = "packages/kitesurf-cli";

            # aws-lc-sys (via rustls) must build from source: nixpkgs' default
            # system-libs mode points it at a system AWS-LC we do not ship.
            dontCargoUseSystemLibs = true;
            nativeBuildInputs = [ pkgs.cmake ];

            # The upstream test suite is gated on Bazel: 9 integration tests
            # read the Bazel-built packages/engine/public/rbi/scene_host.wasm
            # artifact, which is not in git (it is compiled by Bazel from the
            # patched-crates tree). Skip exactly those; keep the rest of the
            # suite running in the sandbox.
            checkFlags = [
              "--skip"
              "wasm::tests"
              "--skip"
              "playback::tests::partial_replay"
              "--skip"
              "playback::tests::retained_replay_reports_corrupt_full_scenes"
              "--skip"
              "font_cache::tests::duplicate_hashes_for_one_font_path_fetch_and_resolve_once"
            ];

            meta = with pkgs.lib; {
              description = "Terminal browser client for Cloudflare Kitesurf, the experimental CDP engine";
              homepage = "https://github.com/cloudflare/kitesurf";
              license = licenses.asl20;
              mainProgram = "kitesurf";
            };
          };
        }
      );
    };
}
