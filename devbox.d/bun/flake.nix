{
  description = "Bun canary overlay - https://github.com/oven-sh/bun/pull/30412";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs = { self, nixpkgs }:
    let
      # Canary build from PR#30412 (Rust rewrite, merged to main May 14)
      # Running `bun upgrade --canary` after installation switches to this.
      version = "1.3.14-canary.1";
      tag = "canary";

      systems = [
        "x86_64-linux"
      ];

      forAllSystems = f: nixpkgs.lib.genAttrs systems (system: f nixpkgs.legacyPackages.${system});

      bun-overlay = final: prev: {
        bun = final.stdenv.mkDerivation {
          pname = "bun";
          inherit version;

          src =
            let
              platform =
                if final.stdenv.hostPlatform.system == "x86_64-linux" then
                {
                  url = "https://github.com/oven-sh/bun/releases/download/${tag}/bun-linux-x64.zip";
                  # Canary is a moving tag — update hash when canary refreshes
                  hash = "sha256-BzjKcAEZNFLpba57xSX8jSyET7Ae7O426PERPX1NEU4=";
                }
                else
                  throw "Unsupported platform: ${final.stdenv.hostPlatform.system}";
            in
            final.fetchzip {
              url = platform.url;
              hash = platform.hash;
            };

          nativeBuildInputs = [ final.unzip final.makeWrapper ] ++ final.lib.optionals final.stdenv.isLinux [ final.autoPatchelfHook ];

          buildInputs = final.lib.optionals final.stdenv.isLinux [
            final.zlib
            final.gcc.cc.lib
          ];

          dontConfigure = true;
          dontBuild = true;

          installPhase = ''
            runHook preInstall

            install -Dm 755 ./bun $out/bin/bun
            ln -s $out/bin/bun $out/bin/bunx

            runHook postInstall
          '';

          meta = {
            description = "Incredibly fast JavaScript runtime, bundler, test runner, and package manager";
            homepage = "https://bun.sh";
            license = final.lib.licenses.mit;
            platforms = systems;
          };
        };
      };
    in
    {
      overlays.default = bun-overlay;

      packages = forAllSystems (pkgs:
        let
          pkgsWithOverlay = pkgs.extend bun-overlay;
        in
        {
          bun = pkgsWithOverlay.bun;
          default = pkgsWithOverlay.bun;
        });

      devShells = forAllSystems (pkgs:
        let
          pkgsWithOverlay = pkgs.extend bun-overlay;
        in
        {
          default = pkgsWithOverlay.mkShell {
            buildInputs = [ pkgsWithOverlay.bun ];
          };
        });
    };
}
