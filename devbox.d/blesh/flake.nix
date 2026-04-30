{
  description = "ble.sh built from master (overlay on official nixpkgs)";

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

          src = pkgs.fetchFromGitHub {
            owner = "akinomyoga";
            repo = "ble.sh";
            rev = "b99cadb4520a1fdec0067fdc007b39cc905ecbad";
            hash = "sha256-LXDow/4yv3V0Liy12bXQ1qwO5z4u0equRO9xeJaDaWo=";
            fetchSubmodules = true;
          };

          version = "0.4.0-devel4+master";
        in
        {
          default = pkgs.stdenvNoCC.mkDerivation {
            pname = "blesh";
            inherit version src;

            nativeBuildInputs = [
              pkgs.gnumake
              pkgs.gawk
              pkgs.git
            ];

            buildInputs = [
              pkgs.bashInteractive
            ];

            dontConfigure = true;

            postUnpack = ''
              # Provide git metadata so the Makefile doesn't need .git
              cat > source/make/.git-archive-export.mk <<EOF
          BLE_GIT_COMMIT_ID = ${src.rev}
          BLE_GIT_BRANCH = master
          EOF
            '';

            buildPhase = ''
              make build PREFIX=$out
            '';

            installPhase = ''
              runHook preInstall

              mkdir -p "$out/share/blesh/lib"

              cat <<EOF >"$out/share/blesh/lib/_package.sh"
          _ble_base_package_type=nix

          function ble/base/package:nix/update {
            echo "Ble.sh is installed by Nix. You can update it in the flake." >&2
            return 1
          }
          EOF

              make install PREFIX=$out

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
              description = "Bash Line Editor (ble.sh) — latest master";
              mainProgram = "blesh-share";
              license = pkgs.lib.licenses.bsd3;
              platforms = pkgs.lib.platforms.unix;
            };
          };
        }
      );
    };
}
