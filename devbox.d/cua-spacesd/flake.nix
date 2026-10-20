{
  description = "cua-spacesd - Cua Spaces daemon (Rust) that backs the Cua Spaces desktop app";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { self, nixpkgs }: let
    supportedSystems = [ "x86_64-linux" "aarch64-linux" ];
    forAllSystems = nixpkgs.lib.genAttrs supportedSystems;

    version = "0.5.3";

    systemToTarget = {
      "x86_64-linux"  = "x86_64";
      "aarch64-linux" = "aarch64";
    };

    # Literal SRI hashes only. This map sits OUTSIDE pkgs scope, so
    # pkgs.lib.fakeHash does not evaluate and a bump can reset them.
    systemToHash = {
      "x86_64-linux"  = "sha256-nIiE02TBuI5U+uSikcpogVZyD3tT0kVUxWn2vg+mCxk=";
      "aarch64-linux" = "sha256-eOS77T7weQJpAYQxyjy5TG1k8EKiji8Vd80PPIkCB2Q=";
    };
  in {
    packages = forAllSystems (system:
      let
        # The daemon ships under the FSL, whose competing-use clause makes
        # nixpkgs classify the licence as unfree.
        pkgs = import nixpkgs {
          inherit system;
          config.allowUnfree = true;
        };
      in
      rec {
        cua-spacesd = pkgs.stdenv.mkDerivation rec {
          pname = "cua-spacesd";
          inherit version;

          # The release line "cua-spacesd-v" is what the detector reads between
          # /releases/download/ and the version; the "cua-spacesd-linux-" prefix
          # is what the updater cuts the asset name at.
          src = pkgs.fetchurl {
            url = "https://github.com/trycua/cua/releases/download/cua-spacesd-v${version}/cua-spacesd-linux-${systemToTarget.${system}}.tar.gz";
            hash = systemToHash.${system};
          };

          # Flat tarball: cua-spacesd, LICENSE, THIRD_PARTY_NOTICES.md.
          dontUnpack = true;

          # The ELF interpreter is /lib64/ld-linux-x86-64.so.2, so the binary
          # needs its interpreter and RPATH rewritten for the Nix store.
          nativeBuildInputs = [ pkgs.gnutar pkgs.autoPatchelfHook ];

          # libstdc++.so.6 and libgcc_s.so.1 both live in libgcc's lib output.
          buildInputs = [ pkgs.libgcc.lib pkgs.libX11 pkgs.libXi ];

          installPhase = ''
            runHook preInstall
            mkdir -p $out/bin $out/share/licenses/cua-spacesd
            tar xzf $src
            install -m755 cua-spacesd $out/bin/cua-spacesd
            install -m644 LICENSE THIRD_PARTY_NOTICES.md $out/share/licenses/cua-spacesd/
            runHook postInstall
          '';

          meta = with pkgs.lib; {
            description = "Cua Spaces daemon (Rust)";
            homepage = "https://github.com/trycua/cua";
            # The daemon is FSL-1.1-MIT upstream, not MIT.
            license = licenses.fsl11Mit;
            mainProgram = "cua-spacesd";
            platforms = supportedSystems;
          };
        };

        default = cua-spacesd;
      });

    apps = forAllSystems (system: {
      cua-spacesd = {
        type = "app";
        program = "${self.packages.${system}.cua-spacesd}/bin/cua-spacesd";
      };
      default = self.apps.${system}.cua-spacesd;
    });
  };
}
