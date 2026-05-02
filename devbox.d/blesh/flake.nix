{
  description = "ble.sh nightly build";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs = { self, nixpkgs }:
    let
      systems = [ "x86_64-linux" "aarch64-linux" ];
      forAllSystems = nixpkgs.lib.genAttrs systems;
    in
    {
      packages = forAllSystems (system:
        let
          pkgs = nixpkgs.legacyPackages.${system};

          src = pkgs.fetchzip {
            url = "https://github.com/akinomyoga/ble.sh/releases/download/nightly/ble-nightly.tar.xz";
            hash = "sha256-kGLp8RaInYSrJEi3h5kWEOMAbZV/gEPFUjOLgBuMhCI=";
          };

          version = "0.4.0-devel3-nightly";
        in
        {
          default = pkgs.stdenvNoCC.mkDerivation {
            pname = "blesh";
            inherit version src;

            dontBuild = true;

            buildInputs = [
              pkgs.bashInteractive
            ];

            installPhase = ''
              runHook preInstall

              mkdir -p "$out/share/blesh/lib"

              cat <<EOF >"$out/share/blesh/lib/_package.bash"
          _ble_base_package_type=nix

          function ble/base/package:nix/update {
            echo "Ble.sh is installed by Nix. You can update it in the flake." >&2
            return 1
          }
          EOF

              cp -rv $src/* "$out/share/blesh"

              runHook postInstall
            '';

            postInstall = ''
              mkdir -p "$out/bin"
              cat <<EOF > "$out/bin/blesh-share"
          #!${pkgs.runtimeShell}
          echo "$out/share/blesh"
          EOF
              chmod +x "$out/bin/blesh-share"
            '';

            meta = {
              homepage = "https://github.com/akinomyoga/ble.sh";
              description = "Bash Line Editor — nightly build";
              mainProgram = "blesh-share";
              license = pkgs.lib.licenses.bsd3;
              platforms = pkgs.lib.platforms.unix;
            };
          };
        }
      );
    };
}
