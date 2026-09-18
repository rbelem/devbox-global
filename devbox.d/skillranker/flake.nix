{
  description = "skillranker (sr) — session-specific skill advice powered by TypeSafe.ai Jev";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    rust-overlay.url = "github:oxalica/rust-overlay";
    skillranker-src = {
      # Pinned to main HEAD at flake creation. Bump together with `rev` below
      # AND refresh ./Cargo.lock + ./Cargo.lock.pathdeps from the same rev.
      url = "github:Dicklesworthstone/skillranker/3fe85c432ba5e2b4f980e842fc94d57fae6c4189";
      flake = false;
    };
  };

  outputs = { self, nixpkgs, rust-overlay, skillranker-src }:
    let
      rev = "3fe85c432ba5e2b4f980e842fc94d57fae6c4189"; # MUST match skillranker-src url
      systems = [ "x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin" ];
      forAllSystems = nixpkgs.lib.genAttrs systems;

      # Git deps pinned by skillranker's Cargo.lock (hashes verified upstream).
      frankensearchRev = "39047c44c3a92ceb71d25c602913b8b2888e2fe7";
      asupersyncRev = "81fb7b579ce5f161622f1524391f5202a641cc2e";
    in
    {
      packages = forAllSystems (system:
        let
          pkgs = import nixpkgs { inherit system; overlays = [ rust-overlay.overlays.default ]; };
          inherit (pkgs) lib fetchgit runCommand;

          # Upstream pins nightly-2026-08-31 (rust-toolchain.toml): stable cargo
          # (<=1.98) rejects frankensearch's `default-features = false` workspace
          # inheritance. makeRustPlatform wires this toolchain through every
          # stage (vendoring + build).
          rustNightly = pkgs.rust-bin.nightly."2026-08-31".minimal;
          rustPlatform = pkgs.makeRustPlatform {
            cargo = rustNightly;
            rustc = rustNightly;
          };

          # frankensearch's workspace is not parseable from a clean checkout:
          # the `tools/optimize_params` member path-deps on `../../../fast_cmaes`
          # (a sibling repo outside the tree). That member is not part of
          # skillranker's dependency graph, so drop it from `workspace.members`.
          frankensearchPatched = runCommand "frankensearch-${builtins.substring 0 7 frankensearchRev}-patched" { } ''
            cp -r ${fetchgit {
              url = "https://github.com/Dicklesworthstone/frankensearch.git";
              rev = frankensearchRev;
              sha256 = "sha256-kxUOR9OxqodLFAg85RJgW/p+cf6yJnNbnXBFQ7skR2M=";
            }} $out
            chmod -R u+w $out
            sed -i '\|"tools/optimize_params",|d' $out/Cargo.toml
          '';

          asupersyncTree = fetchgit {
            url = "https://github.com/Dicklesworthstone/asupersync";
            rev = asupersyncRev;
            sha256 = "sha256-5XveaBbQ1AGoYkmk7Kw54ee6rl1HNlhIp3V2HhdLqB8=";
          };
        in
        {
          default = rustPlatform.buildRustPackage {
            pname = "skillranker";
            version = "0.1.0-main-${builtins.substring 0 7 rev}";
            src = skillranker-src;

            # Registry-only vendoring: nixpkgs' cargoLock machinery (and
            # fetchCargoVendor) cannot handle the frankensearch/asupersync git
            # workspaces, so the git deps are rewritten to PATH deps below and
            # the committed ./Cargo.lock.pathdeps has their `source` lines
            # stripped. prePatch performs the identical rewrite on the source
            # tree, keeping the hook's byte-identical lockfile check happy.
            cargoLock.lockFile = ./Cargo.lock.pathdeps;

            prePatch = ''
              mkdir vendor-git
              cp -r ${frankensearchPatched} vendor-git/frankensearch
              cp -r ${asupersyncTree} vendor-git/asupersync
              chmod -R u+w vendor-git

              sed -E -i \
                -e 's#frankensearch-(core|quill|index) = \{ git = "[^"]+", rev = "[^"]+"#frankensearch-\1 = { path = "vendor-git/frankensearch/crates/frankensearch-\1"#' \
                -e 's#asupersync = \{ git = "[^"]+", rev = "[^"]+"#asupersync = { path = "vendor-git/asupersync"#' \
                Cargo.toml
              sed -i '/source = "git+/d' Cargo.lock
            '';

            # Upstream test suite drives harness/session fixtures; not hermetic in
            # the sandbox. Verify via `result/bin/sr doctor` after install instead.
            doCheck = false;

            meta = with lib; {
              description = "Session-specific skill advice powered by TypeSafe.ai Jev";
              homepage = "https://github.com/Dicklesworthstone/skillranker";
              # MIT plus an AI-lab rider per upstream LICENSE/badge.
              license = licenses.mit;
              mainProgram = "sr";
              platforms = systems;
            };
          };
        });
    };
}
