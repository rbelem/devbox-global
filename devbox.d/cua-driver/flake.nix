{
  description = "cua-driver - Cua computer-use driver (Rust) with Wayland/X11 helpers";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { self, nixpkgs }: let
    supportedSystems = [ "x86_64-linux" ];
    forAllSystems = f: nixpkgs.lib.genAttrs supportedSystems (system: f nixpkgs.legacyPackages.${system});

    version = "0.33.2";
  in {
    packages = forAllSystems (pkgs: rec {
      cua-driver = pkgs.stdenv.mkDerivation rec {
        pname = "cua-driver";
        inherit version;

        # Upstream ships amd64-linux only.
        src = pkgs.fetchurl {
          url = "https://github.com/trycua/cua/releases/download/cua-driver-rs-v${version}/cua-driver-rs-${version}-linux-x86_64-binary.tar.gz";
          hash = "sha256-hF0MTrFdm6rxND5TB02/u+9a3MTkFVJrkp5UnSUPIhs=";
        };

        # Tarball is flat: cua-driver, cua-cursor-theme, wayland-helper/,
        # libcua_driver_sdk.so, cua_driver_node_runtime.node, cua_driver_abi.h.
        dontUnpack = true;

        nativeBuildInputs = [ pkgs.gnutar pkgs.autoPatchelfHook ];
        buildInputs = [ pkgs.libX11 pkgs.libXi pkgs.libxkbcommon pkgs.libgcc ];

        installPhase = ''
          runHook preInstall
          mkdir -p $out/bin $out/lib $out/include/cua
          tar xzf $src
          install -m755 cua-driver       $out/bin/cua-driver
          install -m755 cua-cursor-theme $out/bin/cua-cursor-theme
          cp -R wayland-helper $out/bin/wayland-helper
          install -m755 libcua_driver_sdk.so       $out/lib/libcua_driver_sdk.so
          install -m755 cua_driver_node_runtime.node $out/lib/cua_driver_node_runtime.node
          install -m644 cua_driver_abi.h $out/include/cua/cua_driver_abi.h
          runHook postInstall
        '';

        meta = with pkgs.lib; {
          description = "Cua computer-use driver (Rust) with Wayland/X11 helpers";
          homepage = "https://github.com/trycua/cua";
          license = licenses.mit;
          mainProgram = "cua-driver";
          platforms = supportedSystems;
        };
      };

      default = cua-driver;
    });

    apps = forAllSystems (pkgs: {
      cua-driver = {
        type = "app";
        program = "${self.packages.${pkgs.system}.cua-driver}/bin/cua-driver";
      };
      default = self.apps.${pkgs.system}.cua-driver;
    });
  };
}
