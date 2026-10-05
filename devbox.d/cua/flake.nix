{
  description = "cua - Cua CLI for computer-use agents (controlling computers)";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { self, nixpkgs }: let
    supportedSystems = [ "x86_64-linux" ];
    forAllSystems = f: nixpkgs.lib.genAttrs supportedSystems (system: f nixpkgs.legacyPackages.${system});

    version = "0.3.1";
  in {
    packages = forAllSystems (pkgs: rec {
      cua = pkgs.stdenv.mkDerivation rec {
        pname = "cua";
        inherit version;

        # Upstream ships amd64-linux only.
        src = pkgs.fetchurl {
          url = "https://github.com/trycua/cua/releases/download/cua-sdk-v${version}/cua-cli-${version}-linux-x64.tar.gz";
          hash = "sha256-xbPeR6j8oz5vlDxoLdPyQ9dpanldfyZxGfJiVhfka+M=";
        };

        # Tarball is flat: a single `cua` executable at the root.
        dontUnpack = true;

        nativeBuildInputs = [ pkgs.gnutar pkgs.autoPatchelfHook ];
        buildInputs = [ pkgs.libgcc ];

        installPhase = ''
          runHook preInstall
          mkdir -p $out/bin
          tar xzf $src
          install -m755 cua $out/bin/cua
          runHook postInstall
        '';

        meta = with pkgs.lib; {
          description = "Cua CLI for computer-use agents";
          homepage = "https://github.com/trycua/cua";
          license = licenses.mit;
          mainProgram = "cua";
          platforms = supportedSystems;
        };
      };

      default = cua;
    });

    apps = forAllSystems (pkgs: {
      cua = {
        type = "app";
        program = "${self.packages.${pkgs.system}.cua}/bin/cua";
      };
      default = self.apps.${pkgs.system}.cua;
    });
  };
}
