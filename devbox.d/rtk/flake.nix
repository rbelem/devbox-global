{
  description = "rtk - Rust Token Killer, high-performance CLI proxy to minimize LLM token consumption (develop branch)";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { self, nixpkgs }:
    let
      supportedSystems = [ "x86_64-linux" "aarch64-linux" ];
      forAllSystems = f: nixpkgs.lib.genAttrs supportedSystems (system: f nixpkgs.legacyPackages.${system});
    in
    {
      packages = forAllSystems (pkgs: rec {
        rtk = pkgs.rustPlatform.buildRustPackage rec {
          pname = "rtk";
          version = "0.39.0";

          src = pkgs.fetchFromGitHub {
            owner = "rtk-ai";
            repo = "rtk";
            rev = "v${version}";
            #hash = pkgs.lib.fakeHash;
            hash = "sha256-TX4MtR/rq61wxHWYJAO2x3CYvZtkCoXynf45dRC+MVo=";
          };

          #cargoHash = pkgs.lib.fakeHash;
          cargoHash = "sha256-s3AtUftUZtzhlep8R/ZuxwmGELIZpqbQXqLTD+aS4Ro=";

          nativeBuildInputs = [ pkgs.pkg-config ];

          buildInputs = with pkgs; [
            openssl
            sqlite
          ] ++ lib.optionals stdenv.isLinux [
            libgcc
          ];

          doCheck = false;

          env = {
            OPENSSL_NO_VENDOR = "1";
            OPENSSL_DIR = "${pkgs.openssl.dev}";
            OPENSSL_LIB_DIR = "${pkgs.openssl.out}/lib";
          };

          meta = with pkgs.lib; {
            description = "High-performance CLI proxy to minimize LLM token consumption";
            homepage = "https://github.com/rtk-ai/rtk";
            license = licenses.mit;
            mainProgram = "rtk";
            platforms = supportedSystems;
          };
        };

        default = rtk;
      });

      apps = forAllSystems (pkgs: {
        rtk = {
          type = "app";
          program = "${self.packages.${pkgs.system}.rtk}/bin/rtk";
        };
        default = self.apps.${pkgs.system}.rtk;
      });
    };
}
