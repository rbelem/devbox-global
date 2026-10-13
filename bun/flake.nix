{
  description = "Bun overlay - latest release (baseline) from GitHub";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs = { self, nixpkgs }:
    let
      version = "1.3.14";
      tag = "bun-v${version}";

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
                  # Baseline build: no AVX/AVX2 — compatible with VirtualBox,
                  # older CPUs, and emulated x86-64. SIGILL / ILL_ILLOPN on
                  # VMs when using the optimized (-x64) build.
                  url = "https://github.com/oven-sh/bun/releases/download/${tag}/bun-linux-x64-baseline.zip";
                  hash = "sha256-vglDdJBMSzCC7+NrMg1CP+Dq052aWvDGGfdP6H23xf8=";
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
