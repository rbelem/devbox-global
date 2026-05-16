{
  description = "OpenCode built from source (overlay on official nixpkgs)";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs = { self, nixpkgs }:
    let
      systems = [ "x86_64-linux" ];
      forAllSystems = nixpkgs.lib.genAttrs systems;

      # ── Bun version ─────────────────────────────────────────────
      # 1.3.13 baseline (no AVX — works on VirtualBox).
      # 1.3.14 crashes on VMs and its build --compile is broken.
      bunVersion = "1.3.13";
      bunHash = "sha256-nYokKSpwaAkCBdqsCloiP19pc29Sh+N7+I07QDHtx1A=";

      # Overlay that replaces nixpkgs' bun with 1.3.13 baseline.
      bun-baseline-overlay = final: prev: {
        bun = prev.bun.overrideAttrs (old: {
          src = prev.fetchurl {
            url = "https://github.com/oven-sh/bun/releases/download/bun-v${bunVersion}/bun-linux-x64-baseline.zip";
            hash = bunHash;
          };
        });
      };
    in
    {
      packages = forAllSystems (system:
        let
          pkgs = import nixpkgs {
            inherit system;
            overlays = [ bun-baseline-overlay ];
          };
          version = "1.15.3";

          # Get the real hash:
          #   cd ~/.local/share/devbox/global/current/devbox.d/opencode
          #   uncomment the lines containing fakeHash and comment the lines containing real hashes
          #   run the command "devbox global update"
          # Then paste the sha256-... value below
          # It will fail twice, for srcHash and nodeModulesHash
          #
          #srcHash = pkgs.lib.fakeHash;
          srcHash = "sha256-OKQR76q7trKQTvlMxH8tG2jNnRtBe3YeFfvNw8c3+8I=";
          #nodeModulesHash = pkgs.lib.fakeHash;
          nodeModulesHash = "sha256-O6czNd9n6b0TTIsPseZn9qOlxsPzRTrePu3L6gM13oM=";

          src = pkgs.fetchFromGitHub {
            owner = "anomalyco";
            repo = "opencode";
            rev = "v${version}";
            hash = srcHash;
          };
        in
        {
          default = pkgs.opencode.overrideAttrs (oldAttrs: {
            inherit version src;
            node_modules = oldAttrs.node_modules.overrideAttrs (oldNode: {
              inherit src version;
              pname = "opencode-node_modules";
              outputHash = nodeModulesHash;
              outputHashAlgo = "sha256";
              outputHashMode = "recursive";
            });
          });
        }
      );
    };
}
