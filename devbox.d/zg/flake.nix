{
  description = "zg (zvec-grep) - local-first hybrid workspace search for humans and AI agents";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { self, nixpkgs }:
    let
      # x86_64-linux only: native-heavy package (onnxruntime, napi bindings,
      # prebuilt GPU backends); arm64 musl ignore-list entries and darwin
      # dylib resolution are unverified. Same restriction as devbox.d/wigolo.
      systems = [ "x86_64-linux" ];
      forAllSystems = nixpkgs.lib.genAttrs systems;

      version = "0.2.1";
    in
    {
      packages = forAllSystems (system:
        let
          pkgs = nixpkgs.legacyPackages.${system};

          src = pkgs.fetchFromGitHub {
            owner = "zvec-ai";
            repo = "zvec-grep";
            rev = "v${version}";
            hash = "sha256-8bP+w2YSzWlTJbipmF8ighraZRDye0uiZmd8+Pz4WE8=";
          };

          # Get the real npmDepsHash:
          #   1. Set npmDepsHash to pkgs.lib.fakeHash
          #   2. Run: nix build "path:...#default"
          #   3. Replace with the hash from the error message
          # Keep this AFTER src: nix fails src first, and update-flake pastes
          # each "got:" hash into the first remaining fakeHash in file order.
          npmDepsHash = "sha256-pc04qzhnYaS0xpQAYwN6HEG8oPEqoBIBMVKC1OZ0L+8=";
        in
        {
          default = pkgs.buildNpmPackage {
            pname = "zg";
            inherit version src npmDepsHash;

            # Requires Node.js >= 22 per upstream
            nodejs = pkgs.nodejs_22;

            # nixpkgs `npm ci` already runs --ignore-scripts, but npmFlags
            # also propagates to `npm rebuild` and `npm run build`. Needed to
            # skip lifecycle scripts that break in the sandbox:
            #   - @vscode/ripgrep downloads an rg binary on install
            #     (the @vscode/ripgrep-linux-x64 platform package already
            #     ships bin/rg, and zg also falls back to `rg` on PATH)
            #   - @zvec/zvec install.js only validates; the binding is
            #     loaded at require-time from @zvec/bindings-linux-x64
            #   - node-llama-cpp (optional dep): its prebuilt CUDA/Vulkan
            #     backend packages cannot resolve libcuda/libvulkan here;
            #     zg dynamic-imports it in try/catch, so postInstall prunes
            #     it and local GGUF embedding models are unavailable
            npmFlags = [ "--ignore-scripts" ];

            # Patch prebuilt native modules in the shipped node_modules tree
            # (onnxruntime-node and @zvec/bindings-linux-x64 need libstdc++).
            nativeBuildInputs = [ pkgs.autoPatchelfHook ];
            buildInputs = [ pkgs.stdenv.cc.cc.lib ];

            # Binaries in the shipped node_modules that legitimately have no
            # nix-store equivalent — all unused on glibc Linux:
            #   - musl variants of sharp/libvips/reflink (glibc variants load)
            #   - node-llama-cpp CUDA/Vulkan GPU backends (runtime-optional)
            autoPatchelfIgnoreMissingDeps = [
              "libc.musl-x86_64.so.1"
              "libvulkan.so.1"
              "libcudart.so.12"
              "libcublas.so.12"
              "libcudart.so.13"
              "libcublas.so.13"
              "libcuda.so.1"
            ];

            # Drop node_modules trees that can never load on glibc x86_64 —
            # dead weight in the closure: musl sharp/libvips/reflink variants
            # and the node-llama-cpp GPU backends + JS glue. Globs that match
            # nothing are no-ops under `rm -rf`; the find cleans up .bin
            # shims left dangling by the removals.
            postInstall = ''
              rm -rf $out/lib/node_modules/@zvec/zvec-grep/node_modules/@node-llama-cpp \
                $out/lib/node_modules/@zvec/zvec-grep/node_modules/node-llama-cpp \
                $out/lib/node_modules/@zvec/zvec-grep/node_modules/@img/sharp-*linuxmusl-* \
                $out/lib/node_modules/@zvec/zvec-grep/node_modules/@reflink/*-musl
              find $out/lib/node_modules/@zvec/zvec-grep -xtype l -delete
            '';

            meta = with pkgs.lib; {
              description = "Local-first search across your workspace, built for humans and AI agents";
              longDescription = ''
                Agent-friendly hybrid workspace search across code and
                non-code content. Semantic + lexical (ripgrep) search with
                source-linked results, an MCP server mode, and a CLI.
              '';
              homepage = "https://github.com/zvec-ai/zvec-grep";
              license = licenses.asl20;
              mainProgram = "zg";
              platforms = systems;
              maintainers = [ ];
            };
          };
        }
      );
    };
}
