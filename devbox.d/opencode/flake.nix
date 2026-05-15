{
  description = "OpenCode built from source (overlay on official nixpkgs)";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs = { self, nixpkgs }:
    let
      systems = [ "x86_64-linux" ];
      forAllSystems = nixpkgs.lib.genAttrs systems;

      # ── Bun versions ────────────────────────────────────────────
      # Runtime: 1.3.14 baseline (no AVX — works on VirtualBox)
      bunVersion = "1.3.14";
      bunHash = "sha256-oGOQiuCLeFLKEJObvcbO7T3avOj7lALc6D1l1zs25sc=";

      # Build: 1.3.13 baseline — bun build --compile is broken on 1.3.14
      # (Rust rewrite regression: compiled binary crashes with SIGSEGV).
      bunBuildVersion = "1.3.13";
      bunBuildHash = "sha256-nYokKSpwaAkCBdqsCloiP19pc29Sh+N7+I07QDHtx1A=";

      # Overlay that replaces nixpkgs' bun with 1.3.14 baseline,
      # plus adds bun-oc (1.3.13 baseline) for building opencode.
      bun-baseline-overlay = final: prev: {
        # General-purpose bun (runtime)
        bun = prev.bun.overrideAttrs (old: {
          src = prev.fetchurl {
            url = "https://github.com/oven-sh/bun/releases/download/bun-v${bunVersion}/bun-linux-x64-baseline.zip";
            hash = bunHash;
          };
        });
        # Build-only bun (1.3.13 where --compile works)
        bun-oc = prev.bun.overrideAttrs (old: {
          src = prev.fetchurl {
            url = "https://github.com/oven-sh/bun/releases/download/bun-v${bunBuildVersion}/bun-linux-x64-baseline.zip";
            hash = bunBuildHash;
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
          version = "1.15.0";

          # Get the real hash:
          #   cd ~/.local/share/devbox/global/current/devbox.d/opencode
          #   uncomment the lines containing fakeHash and comment the lines containing real hashes
          #   run the command "devbox global update"
          # Then paste the sha256-... value below
          # It will fail twice, for srcHash and nodeModulesHash
          #
          #srcHash = pkgs.lib.fakeHash;
          srcHash = "sha256-qVkOgLXUU/vaWDZIkBeR3Fhkcz7cPshpyQIkuxwKUEM=";
          #nodeModulesHash = pkgs.lib.fakeHash;
          nodeModulesHash = "sha256-JMz70+GLqd8kn6zUIScHDkPruxzEOuZSYJzUFGDvSYc=";

          src = pkgs.fetchFromGitHub {
            owner = "anomalyco";
            repo = "opencode";
            rev = "v${version}";
            hash = srcHash;
          };
        in
        {
          default =
            # Use bun-oc (1.3.13) for the build — 1.3.14's --compile is broken
            (pkgs.opencode.override { bun = pkgs.bun-oc; }).overrideAttrs (oldAttrs: {
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
