{
  description = "Bun (latest release, x64 baseline for VirtualBox compat)";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs = { self, nixpkgs }:
    let
      systems = [ "x86_64-linux" ];
      forAllSystems = nixpkgs.lib.genAttrs systems;

      version = "1.4.0";

      # Bun publishes pre-compiled release zips at this URL. The
      # "baseline" variant targets Nehalem (2008) ISA — no AVX/AVX2 —
      # which is what we want for VirtualBox / older CPU compatibility.
      # Pin the hash with: nix-prefetch-url <releaseUrl>
      releaseUrl = "https://github.com/oven-sh/bun/releases/download/bun-v\${version}/bun-linux-x64-baseline.zip";
    in
    {
      packages = forAllSystems (system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
        in
        {
          default = pkgs.stdenvNoCC.mkDerivation {
            pname = "bun";
            inherit version;

            src = pkgs.fetchurl {
              url = releaseUrl;
              sha256 = "sha256-GE+0WV8NQBohfPfHjBvEMLqDMU2reouUgFurv3+nCX8=";
            };

            nativeBuildInputs = [
              pkgs.unzip
              pkgs.makeWrapper
            ] ++ pkgs.lib.optionals pkgs.stdenv.isLinux [
              pkgs.autoPatchelfHook
            ];

            buildInputs = pkgs.lib.optionals pkgs.stdenv.isLinux [
              pkgs.zlib
              pkgs.gcc.cc.lib
            ];

            dontConfigure = true;
            dontBuild = true;

            # The zip extracts to bun-linux-x64-baseline/bun. stdenv's
            # unpackPhase auto-detects bun-linux-x64-baseline as the
            # $sourceRoot and cd's into it, so by installPhase the cwd
            # is already inside that dir and we reference the binary
            # as just `bun`.
            installPhase = ''
              runHook preInstall

              install -Dm 755 bun $out/bin/bun
              ln -s $out/bin/bun $out/bin/bunx

              runHook postInstall
            '';

            meta = {
              description = "Incredibly fast JavaScript runtime, bundler, test runner, and package manager";
              longDescription = ''
                Bun ${version} release build from oven-sh/bun's GitHub
                releases. Pre-compiled, x86-64 baseline ISA (Nehalem /
                no AVX) for VirtualBox and older CPU compatibility.
                Hash pins the exact release artifact that was verified;
                bump with `nix-prefetch-url <releaseUrl>`.
              '';
              homepage = "https://bun.sh";
              license = pkgs.lib.licenses.mit;
              platforms = systems;
            };
          };
        }
      );
    };
}
