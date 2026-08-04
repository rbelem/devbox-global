{
  description = "valkey-search — Valkey search/vector-search module (valkey-io/valkey-search), built with upstream deps deb";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    vsearch-src = {
      url = "github:valkey-io/valkey-search/1.2.1";
      flake = false;
    };
    highwayhash-src = {
      url = "github:google/highwayhash/a422b896ce10";
      flake = false;
    };
    # Upstream CI deps bundle (static gRPC/protobuf/absl/GTest/re2/c-ares/utf8_range).
    # Needed because nixpkgs abseil exports renamed targets (absl::bad_any_cast vs
    # absl::bad_any_cast_impl) that valkey-search's linux_utils.cmake hard-codes.
    vdeps = {
      url = "https://github.com/valkey-io/valkey-search/releases/download/1.0.0-rc1/valkey-search-deps-ubuntu-noble-amd64.deb";
      flake = false;
    };
  };

  outputs = { self, nixpkgs, vsearch-src, highwayhash-src, vdeps }:
    let
      systems = [ "x86_64-linux" "aarch64-linux" ];
      forAllSystems = nixpkgs.lib.genAttrs systems;
    in
    {
      packages = forAllSystems (system:
        let
          pkgs = nixpkgs.legacyPackages.${system};

          # google/highwayhash: static lib required by valkey-search's
          # WITH_SUBMODULES_SYSTEM=ON path (find_path libhighwayhash.a).
          # Not packaged in nixpkgs; replicate upstream Makefile's lib target
          # (SIP_OBJS + DISPATCHER_OBJS + hh_{portable,avx2,sse41} + c_bindings).
          highwayhash = pkgs.stdenv.mkDerivation {
            pname = "highwayhash";
            version = "0-unstable-2026-08-04";
            src = highwayhash-src;
            nativeBuildInputs = [ pkgs.gcc ];
            buildPhase = ''
              runHook preBuild
              mkdir -p obj
              CXXFLAGS_BASE="-O2 -fPIC -I."
              $CXX -c $CXXFLAGS_BASE highwayhash/sip_hash.cc -o obj/sip_hash.o
              $CXX -c $CXXFLAGS_BASE highwayhash/sip_tree_hash.cc -o obj/sip_tree_hash.o
              $CXX -c $CXXFLAGS_BASE highwayhash/scalar_sip_tree_hash.cc -o obj/scalar_sip_tree_hash.o
              $CXX -c $CXXFLAGS_BASE highwayhash/arch_specific.cc -o obj/arch_specific.o
              $CXX -c $CXXFLAGS_BASE highwayhash/instruction_sets.cc -o obj/instruction_sets.o
              $CXX -c $CXXFLAGS_BASE highwayhash/nanobenchmark.cc -o obj/nanobenchmark.o
              $CXX -c $CXXFLAGS_BASE highwayhash/os_specific.cc -o obj/os_specific.o
              $CXX -c $CXXFLAGS_BASE highwayhash/hh_portable.cc -o obj/hh_portable.o
              $CXX -c $CXXFLAGS_BASE -mavx2 highwayhash/hh_avx2.cc -o obj/hh_avx2.o
              $CXX -c $CXXFLAGS_BASE -msse4.1 highwayhash/hh_sse41.cc -o obj/hh_sse41.o
              $CXX -c $CXXFLAGS_BASE highwayhash/c_bindings.cc -o obj/c_bindings.o
              ar rcs libhighwayhash.a obj/*.o
              runHook postBuild
            '';
            installPhase = ''
              runHook preInstall
              mkdir -p $out/lib $out/include
              cp libhighwayhash.a $out/lib/
              cp -r highwayhash $out/include/highwayhash
              runHook postInstall
            '';
            meta = {
              description = "Fast strong hash functions (static lib for valkey-search)";
              license = pkgs.lib.licenses.asl20;
              platforms = systems;
            };
          };

          # ICU static libs: valkey-search's third_party/icu target hard-requires
          # libicudata.a/libicui18n.a/libicuuc.a (nixpkgs icu ships shared-only),
          # built from the vendored ICU source for exact version match (76.1).
          icu-static = pkgs.stdenv.mkDerivation {
            pname = "icu-static";
            version = "76.1";
            src = "${vsearch-src}/third_party/icu/source";
            nativeBuildInputs = [ pkgs.gcc ];
            configureFlags = [
              "--disable-shared"
              "--enable-static"
              "--disable-samples"
              "--disable-tests"
              "--disable-tools"
            ];
            buildPhase = ''
              runHook preBuild
              # Only the static libs are needed; skip tools/extra/samples.
              mkdir -p lib
              make -j$NIX_BUILD_CORES -C stubdata
              make -j$NIX_BUILD_CORES -C common
              make -j$NIX_BUILD_CORES -C i18n
              make -j$NIX_BUILD_CORES -C io
              runHook postBuild
            '';
            installPhase = ''
              runHook preInstall
              mkdir -p $out/lib
              cp stubdata/libicudata.a lib/libicui18n.a lib/libicuuc.a $out/lib/
              runHook postInstall
            '';
            meta = {
              description = "ICU static libs for valkey-search module";
              license = pkgs.lib.licenses.icu;
              platforms = systems;
            };
          };
        in
        {
          highwayhash = highwayhash;
          icu-static = icu-static;

          default = pkgs.stdenv.mkDerivation {
            pname = "valkey-search";
            version = "1.2.1";
            src = vsearch-src;
            nativeBuildInputs = [ pkgs.cmake pkgs.ninja pkgs.gcc pkgs.git pkgs.binutils pkgs.zstd pkgs.patchelf ];
            buildInputs = [
              pkgs.openssl
              pkgs.systemd
              pkgs.zlib
              # Module must allocate with the same allocator as valkey-server
              # (jemalloc); otherwise dlopen-scope resolution binds malloc to
              # libc (libc is in the module's own DT_NEEDED) → mixed allocators
              # → heap corruption ("free(): invalid size" at module load).
              pkgs.jemalloc
              highwayhash
            ];
            hardeningDisable = [ "format" ];
            patchPhase = ''
              # submodules/CMakeLists.txt reads /etc/os-release (absent/read-only
              # in nix sandbox) and requires git on PATH even in system mode.
              substituteInPlace submodules/CMakeLists.txt \
                --replace-fail 'file(READ "/etc/os-release" OS_RELEASE)' 'set(OS_RELEASE "NAME=\"nixos\"")'
            '';
            preConfigure = ''
              # Extract upstream deps bundle (mirrors ci/build_ubuntu.sh).
              mkdir -p deps-root
              ar x ${vdeps}
              tar --zstd -xf data.tar.zst -C deps-root
              DEPS="$PWD/deps-root/opt/valkey-search-deps"

              # deb binaries (protoc, grpc plugins) link ubuntu libstdc++ and use
              # the ubuntu ELF interpreter — neither exists in the nix sandbox.
              for tool in "$DEPS"/bin/*; do
                patchelf --set-interpreter "$(cat ${pkgs.stdenv.cc}/nix-support/dynamic-linker)" \
                         --add-rpath ${pkgs.stdenv.cc.cc.lib}/lib "$tool" 2>/dev/null || true
              done

              # third_party/icu/CMakeLists.txt expects prebuilt ICU static libs
              # at build/icu/install/lib — provide from icu-static.
              mkdir -p build/icu/install/lib
              cp ${icu-static}/lib/*.a build/icu/install/lib/

              # System-mode find_program(grpc_cpp_plugin/protoc REQUIRED).
              export PATH="$DEPS/bin:$PATH"
            '';
            configurePhase = ''
              runHook preConfigure
              DEPS="$PWD/deps-root/opt/valkey-search-deps"
              cmake -S . -B build -G Ninja \
                -DCMAKE_BUILD_TYPE=Release \
                -DWITH_SUBMODULES_SYSTEM=ON \
                -DBUILD_UNIT_TESTS=OFF \
                -DCMAKE_SHARED_LINKER_FLAGS="-ljemalloc" \
                -DCMAKE_PREFIX_PATH="$DEPS/lib/cmake/protobuf:$DEPS/lib/cmake/absl:$DEPS/lib/cmake/grpc:$DEPS/lib/cmake/GTest:$DEPS/lib/cmake/utf8_range:$DEPS:${highwayhash}" \
                -DGRPC_CPP_PLUGIN_PATH="$DEPS/bin/grpc_cpp_plugin" \
                -Dprotoc_EXE="$DEPS/bin/protoc"
              runHook postConfigure
            '';
            buildPhase = ''
              runHook preBuild
              cmake --build build
              runHook postBuild
            '';
            installPhase = ''
              runHook preInstall
              mkdir -p $out/lib
              cp build/libsearch.so $out/lib/
              runHook postInstall
            '';
            meta = {
              description = "Valkey search/vector-search module (FT.* commands)";
              license = pkgs.lib.licenses.bsd3;
              platforms = systems;
            };
          };
        });
    };
}
