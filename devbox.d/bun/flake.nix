{
  description = "Bun canary (latest main-branch build, x64 baseline for VirtualBox compat)";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs = { self, nixpkgs }:
    let
      systems = [ "x86_64-linux" ];
      forAllSystems = nixpkgs.lib.genAttrs systems;

      # Bun's CI publishes canary builds (latest main-branch HEAD) as
      # pre-compiled zips at this URL. The "baseline" variant targets
      # Nehalem (2008) ISA — no AVX/AVX2 — which is what we want for
      # VirtualBox / older CPU compatibility. Bump the hash with:
      #   nix-prefetch-url https://github.com/oven-sh/bun/releases/download/canary/bun-linux-x64-baseline.zip
      canaryUrl = "https://github.com/oven-sh/bun/releases/download/canary/bun-linux-x64-baseline.zip";
      canarySha256 = "sha256-6Ptf1gu3z+CgYmqeTZL+nWEUWnSZ7SWtI3NnhE3n6QU=";
    in
    {
      packages = forAllSystems (system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
        in
        {
          default = pkgs.stdenvNoCC.mkDerivation {
            pname = "bun";
            version = "1.4.0-canary";

            src = pkgs.fetchurl {
              url = canaryUrl;
              sha256 = canarySha256;
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
              description = "Incredibly fast JavaScript runtime, bundler, test runner, and package manager (canary / main branch)";
              longDescription = ''
                Bun canary build (latest main-branch HEAD) from
                oven-sh/bun's GitHub releases. Pre-compiled, x86-64
                baseline ISA (Nehalem / no AVX) for VirtualBox and
                older CPU compatibility. Hash pins the exact canary
                artifact that was verified; bump with `nix-prefetch-url`
                to track main.
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
