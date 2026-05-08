{
  description = "agent-browser - Browser automation CLI for AI agents";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { self, nixpkgs }: let
    supportedSystems = [ "x86_64-linux" ];
    forAllSystems = f: nixpkgs.lib.genAttrs supportedSystems (system: f nixpkgs.legacyPackages.${system});

    # Map nix system to agent-browser release asset name
    systemToTarget = {
      "x86_64-linux"   = "agent-browser-linux-x64";
    };

    version = "0.27.0";

  in {
    packages = forAllSystems (pkgs: rec {
      agent-browser = pkgs.stdenv.mkDerivation rec {
        pname = "agent-browser";
        inherit version;

        src = pkgs.fetchurl {
          url = "https://github.com/vercel-labs/agent-browser/releases/download/v${version}/${systemToTarget.${pkgs.stdenv.hostPlatform.system}}";
          sha256 = {
            #"x86_64-linux"   = pkgs.lib.fakeHash;
            "x86_64-linux"   = "sha256-wkmpSMtqYN+UMg4xnDcqXmeUZsqOosxOabrE/MfCcPM=";
          }.${pkgs.stdenv.hostPlatform.system};
        };

        dontUnpack = true;

        installPhase = ''
          mkdir -p $out/bin
          install -m755 $src $out/bin/agent-browser
        '';

        dontStrip = true;

        meta = with pkgs.lib; {
          description = "Browser automation CLI for AI agents";
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
