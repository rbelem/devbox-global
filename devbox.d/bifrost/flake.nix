{
  description = "Bifrost — fastest AI gateway (50x faster than LiteLLM) with sub-ms overhead";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs = { self, nixpkgs }:
    let
      systems = [ "x86_64-linux" ];
      forAllSystems = nixpkgs.lib.genAttrs systems;
    in
    {
      packages = forAllSystems (system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
          version = "v1.6.7";
        in
        {
          # Prebuilt static binary from Maxim's CDN.
          # Built with CGO_ENABLED=1 + sqlite_static + -extldflags '-static'
          # so no runtime library dependencies.
          #
          # To bump: check https://github.com/maximhq/bifrost/releases for latest tag,
          # then update `version` and `hash` (run:
          #   curl -sL https://downloads.getmaxim.ai/bifrost/<ver>/linux/amd64/bifrost-http \
          #   | sha256sum | cut -d' ' -f1 | nix hash to-sri --type sha256).
          default = pkgs.stdenv.mkDerivation {
            pname = "bifrost";
            inherit version;

            src = pkgs.fetchurl {
              url = "https://downloads.getmaxim.ai/bifrost/${version}/linux/amd64/bifrost-http";
              hash = "sha256-0aTfxDcntF4vkVr2oQdr5BKeOcE2g5/1kRbQtMjwlBs=";
            };

            dontUnpack = true;

            installPhase = ''
              runHook preInstall
              mkdir -p $out/bin
              install -m755 $src $out/bin/bifrost
              runHook postInstall
            '';

            meta = with pkgs.lib; {
              description = "Fastest enterprise AI gateway with adaptive load balancer, MCP gateway, guardrails";
              homepage = "https://github.com/maximhq/bifrost";
              license = licenses.asl20;
              mainProgram = "bifrost";
              platforms = systems;
            };
          };
        }
      );
    };
}
