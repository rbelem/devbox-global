{
  description = "jcode - coding agent harness with blazing-fast TUI, multi-model, and swarm coordination";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { self, nixpkgs }: let
    supportedSystems = [ "x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin" ];
    forAllSystems = f: nixpkgs.lib.genAttrs supportedSystems (system: f nixpkgs.legacyPackages.${system});

    version = "0.52.0";

    # Upstream uses <os>-<arch> asset suffix (not Rust target triples).
    systemToTarget = {
      "x86_64-linux"   = "linux-x86_64";
      "aarch64-linux"  = "linux-aarch64";
      "x86_64-darwin"  = "macos-x86_64";
      "aarch64-darwin" = "macos-aarch64";
    };

    # Hashes from upstream SHA256SUMS at
    # https://github.com/1jehuang/jcode/releases/download/v${version}/SHA256SUMS
    systemToHash = {
      "x86_64-linux"   = "sha256-lU8KPYyO7wsEygQoDSVxbejYqeNMziAOYaJuBmYA/zw=";
      "aarch64-linux"  = "sha256-G5OxwRXP515p0EdXjM953WPdLuac/NrRknx/DS0QCrE=";
      "x86_64-darwin"  = "sha256-yH9Y++ccVJ809z/1FM5Bey9iCI+6yPH8dbXDBCrbbgc=";
      "aarch64-darwin" = "sha256-/u9yCM4l59zXJVtP9Gt4G9b08TvlhGiLi0yx64wgnJE=";
    };
  in {
    packages = forAllSystems (pkgs: rec {
      jcode = pkgs.stdenv.mkDerivation rec {
        pname = "jcode";
        inherit version;

        target = systemToTarget.${pkgs.stdenv.hostPlatform.system};

        src = pkgs.fetchurl {
          url = "https://github.com/1jehuang/jcode/releases/download/v${version}/jcode-${target}.tar.gz";
          hash = systemToHash.${pkgs.stdenv.hostPlatform.system};
        };

        dontUnpack = true;

        nativeBuildInputs = [ pkgs.gnutar ]
          ++ pkgs.lib.optional pkgs.stdenv.hostPlatform.isLinux pkgs.autoPatchelfHook;
        buildInputs = [ pkgs.stdenv.cc.cc.lib ];

        installPhase = ''
          runHook preInstall
          mkdir -p $out/bin
          tar xzf $src
          # Tarball ships: jcode-<suffix> (sh launcher) + jcode-<suffix>.bin (ELF/Mach-O).
          # The launcher execs <self_dir>/jcode-<suffix>.bin, so both must live in
          # the same directory with their original platform-suffixed names.
          install -m755 jcode-${target}     $out/bin/jcode-${target}
          install -m755 jcode-${target}.bin $out/bin/jcode-${target}.bin
          ln -s jcode-${target} $out/bin/jcode
          runHook postInstall
        '';

        meta = with pkgs.lib; {
          description = "Coding agent harness: blazing-fast TUI, multi-model, swarm coordination";
          homepage = "https://jcode.sh";
          license = licenses.mit;
          mainProgram = "jcode";
          platforms = supportedSystems;
        };
      };

      default = jcode;
    });

    apps = forAllSystems (pkgs: {
      jcode = {
        type = "app";
        program = "${self.packages.${pkgs.system}.jcode}/bin/jcode";
      };
      default = self.apps.${pkgs.system}.jcode;
    });
  };
}
