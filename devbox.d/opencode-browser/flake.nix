{
  description = "opencode-browser - OpenCode's official browser MCP server (anomalyco/browse)";

  # Standalone flake for devbox-global's devbox.d. Upstream distributes a
  # prebuilt Rust binary via Anomaly's release service, not nixpkgs, so we
  # pin the linux-x64 tarball and its sha256 from the stable manifest:
  #   curl -fsSL -A 'browse/stable/install' \
  #     https://anoma.ly/release/browse/cli/stable.json | jq
  # Bump version + url + hash + srcHash together when the stable channel moves.
  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs =
    { self, nixpkgs }:
    let
      supportedSystems = [ "x86_64-linux" ];
      forAllSystems = f: nixpkgs.lib.genAttrs supportedSystems (s: f nixpkgs.legacyPackages.${s});

      version = "0.1.5";
      # sha256 of the release-service tarball, converted to SRI.
      # manifest sha256: 8ba73f16322a42544cad3a97490bfd14957b97b108b58f43913e6ca088a3cdd7
      srcHash = "sha256-i6c/FjIqQlRMrTqXSQv9FJV7l7EItY9DkT5soIijzdc=";
    in
    {
      packages = forAllSystems (pkgs: rec {
        # The upstream binary and MCP entry point are named `browse`; the
        # package/flake name is opencode-browser to distinguish it from other
        # browser-automation tools in this repo.
        opencode-browser = pkgs.stdenv.mkDerivation (finalAttrs: {
          pname = "opencode-browser";
          inherit version;

          src = pkgs.fetchurl {
            url = "https://anoma.ly/release/browse/files/8ba73f16322a42544cad3a97490bfd14957b97b108b58f43913e6ca088a3cdd7/opencode-browse-linux-x64-${version}.tgz";
            hash = srcHash;
          };

          nativeBuildInputs = [ pkgs.autoPatchelfHook ];
          # The release binary is dynamically linked against glibc only.
          buildInputs = [ pkgs.stdenv.cc.cc.lib ];

          dontConfigure = true;
          dontBuild = true;

          installPhase = ''
            runHook preInstall
            mkdir -p $out/bin
            install -m 755 bin/browse $out/bin/browse
            runHook postInstall
          '';

          doInstallCheck = true;
          installCheckPhase = ''
            runHook preInstallCheck
            $out/bin/browse --version | grep -q "${finalAttrs.version}"
            runHook postInstallCheck
          '';

          meta = {
            description = "Official OpenCode browser MCP server - drives your real browser";
            homepage = "https://opencode.ai/product/browse";
            sourceProvenance = [ pkgs.lib.sourceTypes.binaryNativeCode ];
            license = pkgs.lib.licenses.mit;
            platforms = supportedSystems;
            mainProgram = "browse";
          };
        });

        default = opencode-browser;
      });

      apps = forAllSystems (
        pkgs:
        let
          system = pkgs.stdenv.hostPlatform.system;
        in
        {
          opencode-browser = {
            type = "app";
            program = "${self.packages.${system}.opencode-browser}/bin/browse";
          };
          default = self.apps.${system}.opencode-browser;
        }
      );
    };

  # Note: this flake packages only the MCP server CLI. Pairing with the
  # Chromium extension is a one-time `browse install` (or a declarative
  # mcp.servers.browse entry in ~/.config/opencode/opencode.json).
}
