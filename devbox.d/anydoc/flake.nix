{
  description = "anydoc - Convert Word, PowerPoint, Excel, ODT, RTF, EPUB, CSV, PDF to GitHub-Flavored Markdown (CLI)";

  # upstream: firecrawl/anydoc
  #
  # Not a source build: upstream ships the CLI as the @firecrawl/anydoc npm
  # package wrapping a prebuilt napi-rs native module (Rust core, glibc-linked).
  # Install the npm tarball + the linux-x64-gnu addon .node (autoPatchelf'd)
  # and wrap cli.js with nixpkgs nodejs. The napi loader in index.js tries the
  # local ./anydoc.linux-x64-gnu.node before the platform npm package, so the
  # addon .node is dropped straight into the package dir.
  #
  # Bump = update version + both fetchurl hashes (npm registry versions track
  # GitHub releases 1:1; update-flake finds the repo via meta.homepage).

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { self, nixpkgs }:
    let
      supportedSystems = [ "x86_64-linux" ];
      forAllSystems = f: nixpkgs.lib.genAttrs supportedSystems (system: f nixpkgs.legacyPackages.${system});
    in
    {
      packages = forAllSystems (pkgs:
        let
          version = "0.2.4";
          main = pkgs.fetchurl {
            url = "https://registry.npmjs.org/@firecrawl/anydoc/-/anydoc-${version}.tgz";
            hash = "sha256-Ylv2zcJMyR7uj7/ghMH6VscbF/A0NB1KI7yN8P3uMb0=";
          };
          addon = pkgs.fetchurl {
            url = "https://registry.npmjs.org/@firecrawl/anydoc-linux-x64-gnu/-/anydoc-linux-x64-gnu-${version}.tgz";
            hash = "sha256-yoIuo60pqbnKa39tKms9UxEVOvJabDWn9b3weR/n8sk=";
          };
        in
        rec {
          anydoc = pkgs.stdenvNoCC.mkDerivation {
            pname = "anydoc";
            inherit version;

            nativeBuildInputs = [
              pkgs.autoPatchelfHook
              pkgs.makeWrapper
            ];
            # Rust cdylib: glibc + libgcc_s.
            buildInputs = [ pkgs.stdenv.cc.cc.lib ];

            dontBuild = true;
            dontConfigure = true;

            unpackPhase = ''
              runHook preUnpack
              unpackDir=$TMPDIR/pkg
              mkdir -p $unpackDir
              tar -xzf ${main} -C $unpackDir --strip-components=1
              tar -xzf ${addon} -C $unpackDir --strip-components=1 \
                package/anydoc.linux-x64-gnu.node package/package.json
              runHook postUnpack
            '';

            installPhase = ''
              runHook preInstall
              pkgdir=$out/lib/node_modules/@firecrawl/anydoc
              mkdir -p $pkgdir $out/bin
              cp -R $unpackDir/. $pkgdir/
              makeWrapper ${pkgs.nodejs}/bin/node $out/bin/anydoc \
                --add-flags "$pkgdir/cli.js"
              runHook postInstall
            '';

            meta = with pkgs.lib; {
              description = "Convert documents (doc, docx, odt, pdf, ppt, pptx, rtf, epub, xlsx, ods, odp, csv) to GitHub-Flavored Markdown";
              homepage = "https://github.com/firecrawl/anydoc";
              license = licenses.mit;
              mainProgram = "anydoc";
              platforms = supportedSystems;
            };
          };

          default = anydoc;
        });
    };
}
