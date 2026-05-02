{
  description = "Bun overlay - latest release from GitHub";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs = { self, nixpkgs }:
    let
      version = "1.3.13";
      tag = "bun-v${version}";

      systems = [
        "x86_64-linux"
        "aarch64-linux"
        "x86_64-darwin"
        "aarch64-darwin"
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
                  { url = "https://github.com/oven-sh/bun/releases/download/${tag}/bun-linux-x64.zip"; hash = "sha256-r2XOCbddEr4az75VZ+WjTGLwD5LEE7t0LnD+l1VmhIw="; }
                else if final.stdenv.hostPlatform.system == "aarch64-linux" then
                  { url = "https://github.com/oven-sh/bun/releases/download/${tag}/bun-linux-aarch64.zip"; hash = "sha256-qy8F7kagLjW/ear7+PXSSXGpYNnCn5zMlxFq2GSZgBQ="; }
                else if final.stdenv.hostPlatform.system == "x86_64-darwin" then
                  { url = "https://github.com/oven-sh/bun/releases/download/${tag}/bun-darwin-x64.zip"; hash = "sha256-37lYTtUkZO2GUhMd4J7m0X9WvwasaqAOPOY4yoaQhhs="; }
                else if final.stdenv.hostPlatform.system == "aarch64-darwin" then
                  { url = "https://github.com/oven-sh/bun/releases/download/${tag}/bun-darwin-aarch64.zip"; hash = "sha256-UhyGh087Tfjg+3GZoyhb6pEj4mYSRWs5vnKPJV8Clic="; }
                else
                  throw "Unsupported platform: ${final.stdenv.hostPlatform.system}";
            in
            final.fetchzip {
              url = platform.url;
              hash = platform.hash;
            };

          nativeBuildInputs = [ final.unzip ] ++ final.lib.optionals final.stdenv.isLinux [ final.autoPatchelfHook ];

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
