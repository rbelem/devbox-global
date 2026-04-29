{
  description = "agent-browser - Browser automation CLI for AI agents";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { self, nixpkgs }: let
    supportedSystems = [ "x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin" ];
    forAllSystems = f: nixpkgs.lib.genAttrs supportedSystems (system: f nixpkgs.legacyPackages.${system});

    # Map nix system to agent-browser release asset name
    systemToTarget = {
      "x86_64-linux"   = "agent-browser-linux-x64";
      "aarch64-linux"  = "agent-browser-linux-arm64";
      "x86_64-darwin"  = "agent-browser-darwin-x64";
      "aarch64-darwin" = "agent-browser-darwin-arm64";
    };

    version = "0.26.0";

  in {
    packages = forAllSystems (pkgs: rec {
      agent-browser = pkgs.stdenv.mkDerivation rec {
        pname = "agent-browser";
        inherit version;

        src = pkgs.fetchurl {
          url = "https://github.com/vercel-labs/agent-browser/releases/download/v${version}/${systemToTarget.${pkgs.stdenv.hostPlatform.system}}";
          sha256 = {
            "x86_64-linux"   = "1hz3k329n6m4szfcbblr1ksplf2nv5vmdd2iww2fwwmzk8jxr147";
            "aarch64-linux"  = "0is4vf19nsw7rn65qdnb1r8qlgla0rvcbrfa3x8ycv4g54bip45k";
            "x86_64-darwin"  = "1nw38bfp95a0dm6x00fmhanq0sx6xh2v8bb8ywjz83s3hm28y6gm";
            "aarch64-darwin" = "0l16mslkldln7ahln1lqinln6gplgy6jn4b41zc2nlmbaxyazxqq";
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
