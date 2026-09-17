{
  description = "goose - open source, extensible AI agent";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { self, nixpkgs }: let
    supportedSystems = [
      "x86_64-linux"
      "aarch64-linux"
      "x86_64-darwin"
      "aarch64-darwin"
    ];
    forAllSystems = f: nixpkgs.lib.genAttrs supportedSystems
      (system: f nixpkgs.legacyPackages.${system});

    version = "1.46.0";

    systemToTarget = {
      "x86_64-linux"   = "x86_64-unknown-linux-musl";
      "aarch64-linux"  = "aarch64-unknown-linux-musl";
      "x86_64-darwin"  = "x86_64-apple-darwin";
      "aarch64-darwin" = "aarch64-apple-darwin";
    };

    systemToHash = {
      "x86_64-linux"   = "sha256-B+L7Sxi3mMDT+ySDCFX2phPGVBA2TErKMfw1DGx1jv8=";
      "aarch64-linux"  = "sha256-FXrCH9YlFePFc9HGaFy3su4Yyz3mipoSe4ByRf2SHCg=";
      "x86_64-darwin"  = "sha256-Dn6cYtOzOqx2vzrIRSUdmV1mgd1kmZ7L7UqgvglwGbM=";
      "aarch64-darwin" = "sha256-aQU0gZ8v6CQhce7BaFFE8vVfaJdWjBSaImvAfDsvUnw=";
    };
  in {

    packages = forAllSystems (pkgs: rec {
      # The upstream goose binary. Ships `goose tui`, but that subcommand shells
      # out to `npx @aaif/goose@latest` whose SDK calls `_goose/...` methods the
      # binary doesn't implement (they live under `_goose/unstable/...`). We wrap
      # it so `goose tui` uses the patched TUI in `goose-tui`.
      goose = pkgs.stdenv.mkDerivation rec {
        pname = "goose";
        inherit version;

        src = pkgs.fetchurl {
          url = "https://github.com/aaif-goose/goose/releases/download/v${version}/goose-${systemToTarget.${pkgs.stdenv.hostPlatform.system}}.tar.gz";
          hash = systemToHash.${pkgs.stdenv.hostPlatform.system};
        };

        dontUnpack = true;

        nativeBuildInputs = [ pkgs.makeWrapper ];

        installPhase = ''
          runHook preInstall
          mkdir -p $out/bin
          tar xzf $src
          install -m755 goose $out/bin/goose

          # `goose tui` finds a local TUI at `ui/text/dist/tui.js` relative to the
          # binary (it walks up to 6 parent dirs), then runs it with `node`, so we
          # place the patched TUI + its node_modules under $out and make `node`
          # (and the sibling TUI script) available on PATH.
          mkdir -p $out/ui/text
          cp -r ${goose-tui}/dist $out/ui/text/dist
          cp -r ${goose-tui}/node_modules $out/ui/text/node_modules

          # Rename the real binary, then wrap it in place so `node` is on PATH
          # when `goose tui` re-execs `node <ui/text/dist/tui.js>`.
          mv $out/bin/goose $out/bin/.goose-real
          makeWrapper $out/bin/.goose-real $out/bin/goose \
            --prefix PATH : ${pkgs.nodejs}/bin
          runHook postInstall
        '';

        meta = with pkgs.lib; {
          description = "Open source, extensible AI agent";
          homepage = "https://github.com/aaif-goose/goose";
          license = licenses.asl20;
          mainProgram = "goose";
          platforms = supportedSystems;
        };
      };

      # Patched TUI. The `@aaif/goose` npm package's SDK (0.20.1) references
      # `_goose/...` ACP methods, but the goose binary serves them under
      # `_goose/unstable/...`. We build it from npm and rewrite those method
      # names via `tui/patch-sdk-namespace.py`.
      goose-tui = pkgs.buildNpmPackage {
        pname = "goose-tui";
        version = "0.20.1";

        src = pkgs.fetchurl {
          url = "https://registry.npmjs.org/@aaif/goose/-/goose-0.20.1.tgz";
          hash = "sha256-jXhP7UGX6zZuKFSb0L03ckiYfX16Oh/+LUGgkgwnJwM=";
        };

        # The npm tarball ships no lockfile; we vendor a regenerated one next to
        # this flake so the npm dependency set is pinned.
        prePatch = ''
          cp ${./tui/package-lock.json} package-lock.json
        '';

        # Compute the right hash with `pkgs.lib.fakeHash` and
        # `nix build "path:.#goose-tui"` if the vendored lockfile ever changes.
        npmDepsHash = "sha256-4wy+OR1kBxnFxmtA/J+iriVPdyqYG6bhKq2q6/Jr5r0=";

        dontNpmBuild = true;
        dontNpmInstall = true;

        nativeBuildInputs = [ pkgs.python3 ];

        installPhase = ''
          runHook preInstall

          # Fix the SDK method namespace so `goose tui` can complete setup.
          ${pkgs.python3}/bin/python3 ${./tui/patch-sdk-namespace.py} \
            node_modules/@aaif/goose-sdk/dist/generated/client.gen.js

          # Ship the TUI sources + resolved node_modules. Node resolves bare
          # imports (e.g. `@aaif/goose-sdk/node`) from the nearest `node_modules`
          # walking up from `dist/tui.js`.
          mkdir -p $out
          cp -r dist $out/dist
          cp -r node_modules $out/node_modules

          runHook postInstall
        '';

        meta = with pkgs.lib; {
          description = "Patched goose terminal UI (npm @aaif/goose)";
          homepage = "https://github.com/aaif-goose/goose";
          license = licenses.asl20;
          platforms = supportedSystems;
        };
      };

      default = goose;
    });

    apps = forAllSystems (pkgs: {
      goose = {
        type = "app";
        program = "${self.packages.${pkgs.system}.goose}/bin/goose";
      };
      default = self.apps.${pkgs.system}.goose;
    });
  };
}
