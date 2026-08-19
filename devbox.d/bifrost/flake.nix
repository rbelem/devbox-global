{
  description = "Bifrost — fastest AI gateway (50x faster than LiteLLM) with sub-ms overhead. Built from source (v1.6.11) + sends_done_marker patch (upstream PR #2909) fixing MiniMax/Synthetic SSE [DONE] stream hangs.";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs = { self, nixpkgs }:
    let
      systems = [ "x86_64-linux" ];
      forAllSystems = nixpkgs.lib.genAttrs systems;
      version = "v1.6.11";
    in
    {
      packages = forAllSystems (system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
          lib = pkgs.lib;

          src = pkgs.fetchzip {
            url = "https://github.com/maximhq/bifrost/archive/refs/tags/transports/v1.6.11.tar.gz";
            sha256 = "sha256-Fjw1rUCqbn14lA4PSJo8EFPUotx14bpzVwTmuWSMJfw=";
            stripRoot = true;
          };

          # Patched source: adds sends_done_marker to CustomProviderConfig so the
          # OpenAI stream loop breaks on finish_reason instead of waiting forever
          # for a [DONE] marker that MiniMax/Synthetic never send.
          src' = pkgs.applyPatches {
            name = "bifrost-sends-done-marker";
            inherit src;
            patches = [ ./sends_done_marker.patch ];
          };

          # Admin UI (Vite), built from the same source tree (patch touches Go
          # + schema only, so raw src is fine).
          bifrost-ui = pkgs.buildNpmPackage {
            pname = "bifrost-ui";
            inherit version;
            src = src;
            sourceRoot = "source/ui";

            npmDepsHash = "sha256-aM+yPpvVoc0UtMcJH4hhJWHfApAkBcKdJB+EbI3BFCA=";

            # vite build + tsc typecheck; strip the copy-build step (writes
            # outside $PWD into ../transports/bifrost-http/ui — we copy from
            # out/ ourselves in installPhase).
            npmBuildScript = "build";
            postPatch = ''
              sed -i 's/ && npm run copy-build//' package.json
            '';

            env = {
              NEXT_TELEMETRY_DISABLED = "1";
              NEXT_DISABLE_ESLINT = "1";
            };

            installPhase = ''
              runHook preInstall
              mkdir -p "$out/ui"
              cp -R --no-preserve=mode,ownership,timestamps out/. "$out/ui/"
              runHook postInstall
            '';
          };

          # Local-module replaces so the patched core wins over the proxy pins
          # (transports/go.mod requires core v1.7.5 etc. from the module proxy).
          transportsLocalReplaces = ''
            if [ -f transports/go.mod ]; then
              cat >> transports/go.mod <<'EOF'

            replace github.com/maximhq/bifrost/core => ../core
            replace github.com/maximhq/bifrost/framework => ../framework
            replace github.com/maximhq/bifrost/plugins/governance => ../plugins/governance
            replace github.com/maximhq/bifrost/plugins/compat => ../plugins/compat
            replace github.com/maximhq/bifrost/plugins/logging => ../plugins/logging
            replace github.com/maximhq/bifrost/plugins/maxim => ../plugins/maxim
            replace github.com/maximhq/bifrost/plugins/otel => ../plugins/otel
            replace github.com/maximhq/bifrost/plugins/semanticcache => ../plugins/semanticcache
            replace github.com/maximhq/bifrost/plugins/telemetry => ../plugins/telemetry
            EOF
            fi
          '';
        in
        {
          default = pkgs.buildGoModule {
            pname = "bifrost";
            inherit version;
            src = src';

            modRoot = "transports";
            subPackages = [ "bifrost-http" ];
            vendorHash = "sha256-iTV4d4o9kjVNzEZ5Ekzfoj/qXzsiOrgiNkgAP8NpknI=";

            doCheck = false;

            overrideModAttrs = final: prev: {
              postPatch = (prev.postPatch or "") + transportsLocalReplaces;
            };

            postPatch = transportsLocalReplaces;

            env.CGO_ENABLED = "1";

            nativeBuildInputs = with pkgs; [ pkg-config gcc ];
            buildInputs = [ pkgs.sqlite ];

            preBuild = ''
              # Provide UI assets for //go:embed all:ui
              rm -rf bifrost-http/ui
              mkdir -p bifrost-http/ui
              if [ -d "${bifrost-ui}/ui" ]; then
                cp -R --no-preserve=mode,ownership,timestamps "${bifrost-ui}/ui/." bifrost-http/ui/
              else
                printf '%s\n' '<!doctype html><meta charset="utf-8"><title>Bifrost</title>' > bifrost-http/ui/index.html
              fi
            '';

            ldflags = [
              "-s"
              "-w"
              "-X main.Version=${version}"
            ];

            # devbox/process-compose invokes `bifrost`; keep the old binary name.
            postInstall = ''
              mv "$out/bin/bifrost-http" "$out/bin/bifrost"
            '';

            meta = {
              mainProgram = "bifrost";
              description = "Fastest enterprise AI gateway with adaptive load balancer, MCP gateway, guardrails (patched: sends_done_marker)";
              homepage = "https://github.com/maximhq/bifrost";
              license = lib.licenses.asl20;
              platforms = systems;
            };
          };
        }
      );
    };
}
