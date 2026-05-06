{
  description = "gemini-cli-bin overlay - latest release from GitHub";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs = { self, nixpkgs }:
    let
      version = "0.41.0";

      # Get the real hash:
      #   cd ~/.local/share/devbox/global/current/devbox.d/gemini-cli-bin
      #   uncomment the line containing fakeHash and comment the line containing real hash
      #   run the command "devbox global update"
      # Then paste the sha256-... value below
      #
      #srcHash = pkgs.lib.fakeHash;
      srcHash = "sha256-zLftEapze0IGJsaifmUhiC5mKizZxwsvBGlyeT/oIC8=";

      systems = [
        "x86_64-linux"
        "aarch64-linux"
        "x86_64-darwin"
        "aarch64-darwin"
      ];

      forAllSystems = f: nixpkgs.lib.genAttrs systems (system: f nixpkgs.legacyPackages.${system});

      gemini-cli-bin-overlay = final: prev: {
        gemini-cli-bin = prev.gemini-cli-bin.overrideAttrs (oldAttrs: {
          inherit version;
          src = final.fetchzip {
            url = "https://github.com/google-gemini/gemini-cli/releases/download/v${version}/gemini-cli-bundle.zip";
            hash = srcHash;
            stripRoot = false;
          };
        });
      };
    in
    {
      overlays.default = gemini-cli-bin-overlay;

      packages = forAllSystems (pkgs:
        let
          pkgsWithOverlay = pkgs.extend gemini-cli-bin-overlay;
        in
        {
          gemini-cli-bin = pkgsWithOverlay.gemini-cli-bin;
          default = pkgsWithOverlay.gemini-cli-bin;
        });

      devShells = forAllSystems (pkgs:
        let
          pkgsWithOverlay = pkgs.extend gemini-cli-bin-overlay;
        in
        {
          default = pkgsWithOverlay.mkShell {
            buildInputs = [ pkgsWithOverlay.gemini-cli-bin ];
          };
        });
    };
}