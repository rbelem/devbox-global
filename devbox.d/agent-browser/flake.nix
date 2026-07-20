{
  description = "agent-browser - Browser automation CLI for AI agents (NixOS-compatible)";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { self, nixpkgs }: let
    supportedSystems = [ "x86_64-linux" ];
    forAllSystems = f: nixpkgs.lib.genAttrs supportedSystems (system: f nixpkgs.legacyPackages.${system});

    # Map nix system to agent-browser release asset name
    systemToTarget = {
      "x86_64-linux"   = "agent-browser-linux-x64";
    };

    version = "0.32.3";

  in {
    packages = forAllSystems (pkgs: rec {
      agent-browser = pkgs.stdenv.mkDerivation rec {
        pname = "agent-browser";
        inherit version;

        src = pkgs.fetchurl {
          url = "https://github.com/vercel-labs/agent-browser/releases/download/v${version}/${systemToTarget.${pkgs.stdenv.hostPlatform.system}}";
          sha256 = {
            "x86_64-linux"   = "sha256-JD9uAcS33qU60H2XVN+ZAzxhRYLVxoXFKaHLgcr8OrE=";
          }.${pkgs.stdenv.hostPlatform.system};
        };

        dontUnpack = true;

        # Use nixpkgs chromium as the browser backend — avoids agent-browser's
        # self-downloaded Chrome which fails on NixOS (missing libglib etc.)
        buildInputs = [ pkgs.chromium pkgs.makeWrapper ];

        installPhase = ''
          mkdir -p $out/bin
          install -m755 $src $out/bin/agent-browser-unwrapped

          makeWrapper $out/bin/agent-browser-unwrapped $out/bin/agent-browser \
            --set AGENT_BROWSER_EXECUTABLE_PATH "${pkgs.chromium}/bin/chromium" \
            --prefix PATH : ${pkgs.chromium}/bin

          # Also provide a shell wrapper for manual uses
          cat > $out/bin/agent-browser-env <<'EOF'
#!/usr/bin/env bash
export AGENT_BROWSER_EXECUTABLE_PATH="${pkgs.chromium}/bin/chromium"
export PATH="${pkgs.chromium}/bin:$PATH"
exec "$@"
EOF
          chmod +x $out/bin/agent-browser-env
        '';

        dontStrip = true;

        meta = with pkgs.lib; {
          description = "Browser automation CLI for AI agents (NixOS-compatible with bundled chromium)";
          homepage = "https://github.com/vercel-labs/agent-browser";
          license = licenses.asl20;
          mainProgram = "agent-browser";
          platforms = supportedSystems;
        };
      };

      default = agent-browser;
    });

    apps = forAllSystems (pkgs: {
      agent-browser = {
        type = "app";
        program = "${self.packages.${pkgs.system}.agent-browser}/bin/agent-browser";
      };
      default = self.apps.${pkgs.system}.agent-browser;
    });
  };
}
