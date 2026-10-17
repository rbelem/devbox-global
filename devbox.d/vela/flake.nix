{
  description = "vela - Vela CLI: closed-source agent runtime for open-design's amr integration (npm-only distribution)";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { self, nixpkgs }:
    let
      # The npm platform packages ship Linux ELF only. x86_64-linux is the
      # verified build; aarch64-linux is the same tarball layout but untested
      # on this host.
      systems = [ "x86_64-linux" "aarch64-linux" ];
      forAllSystems = nixpkgs.lib.genAttrs systems;

      # npm registry only (@powerformer/vela-cli is UNLICENSED and has no
      # public repository), so update-flake reports this package as ?? and
      # never auto-updates it. Bump = version + both systemToHash entries
      # below (nix hash convert on the two registry tarballs).
      version = "0.1.6";

      systemToTarget = {
        "x86_64-linux" = "x64";
        "aarch64-linux" = "arm64";
      };

      systemToHash = {
        "x86_64-linux" = "sha256-nfom7kK37dC8XoMzoeJT/4fN5twWbmPp739/8LaR6BE=";
        "aarch64-linux" = "sha256-yFu8kgeUEGlfAmejlmBLbVaFcb4Sltg6oV2lQrKF3G8=";
      };
    in
    {
      packages = forAllSystems (system:
        let
          # The upstream tarball ships UNLICENSED (see meta.license), so this
          # flake evaluates its own nixpkgs with allowUnfree.
          pkgs = import nixpkgs {
            inherit system;
            config.allowUnfree = true;
          };
          target = systemToTarget.${system};
        in
        {
          default = pkgs.stdenvNoCC.mkDerivation {
            pname = "vela";
            inherit version;

            # The platform tarball is the artifact upstream's own installer
            # consumes. It carries exactly two files: bin/vela (Go CLI) and
            # bin/libexec/opencode/opencode (the inner opencode the amr runtime
            # spawns). The @powerformer/vela-cli meta package on top is a JS
            # shim that only spawnSyncs this binary; open-design spawns `vela`
            # from PATH directly, so the shim is not packaged.
            src = pkgs.fetchurl {
              url = "https://registry.npmjs.org/@powerformer/vela-cli-linux-${target}/-/vela-cli-linux-${target}-${version}.tgz";
              hash = systemToHash.${system};
            };

            nativeBuildInputs = [ pkgs.autoPatchelfHook ];

            dontConfigure = true;
            dontBuild = true;
            # The inner opencode is a bun --compile binary (embedded
            # JavaScriptCore bytecode); Nix's strip mangles that embedded data
            # (devbox.d/hunk precedent). autoPatchelfHook still patches both
            # ELFs' interpreter/RPATH, which is what makes the registry
            # binaries runnable.
            dontStrip = true;

            unpackPhase = ''
              runHook preUnpack
              tar -xzf $src --strip-components=1 \
                package/bin/vela package/bin/libexec/opencode/opencode
              runHook postUnpack
            '';

            # vela resolves its companion relative to its own executable
            # directory (the string "libexec/opencode" is embedded in the Go
            # binary), and open-design's agent probe expects the same
            # <root>/bin layout, so both files keep these exact relative
            # positions.
            installPhase = ''
              runHook preInstall
              mkdir -p $out/bin/libexec/opencode
              install -m755 bin/vela $out/bin/vela
              install -m755 bin/libexec/opencode/opencode $out/bin/libexec/opencode/opencode
              runHook postInstall
            '';

            meta = with pkgs.lib; {
              description = "Vela CLI: closed-source agent runtime for open-design's amr integration";
              # Upstream package.json ships UNLICENSED; the tarball is publicly
              # published on npm and is what upstream's installer downloads.
              license = licenses.unfree;
              mainProgram = "vela";
              platforms = systems;
            };
          };
        });
    };
}
