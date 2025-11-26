#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
BUILD_DIR="$SCRIPT_DIR/build"
FFMPEG_DIR="$SCRIPT_DIR/ffmpeg"
OUTPUT_DIR="$SCRIPT_DIR/../../public"

echo "=== Untrunc WASM Build ==="

# Check for Emscripten
if ! command -v emcc &> /dev/null; then
    echo "Error: Emscripten not found!"
    exit 1
fi

echo "Emscripten: $(emcc --version | head -n1)"

# Build FFmpeg
if [ ! -f "$FFMPEG_DIR/lib/libavformat.a" ]; then
    echo ""
    echo "=== Building FFmpeg for WASM ==="
    
    mkdir -p "$FFMPEG_DIR/src"
    cd "$FFMPEG_DIR/src"
    
    FFMPEG_VERSION="7.1"
    if [ ! -f "ffmpeg-$FFMPEG_VERSION.tar.xz" ]; then
        echo "Downloading FFmpeg $FFMPEG_VERSION..."
        curl -L -o "ffmpeg-$FFMPEG_VERSION.tar.xz" "https://ffmpeg.org/releases/ffmpeg-$FFMPEG_VERSION.tar.xz"
    fi
    
    if [ ! -d "ffmpeg-$FFMPEG_VERSION" ]; then
        tar xf "ffmpeg-$FFMPEG_VERSION.tar.xz"
    fi
    
    cd "ffmpeg-$FFMPEG_VERSION"
    make distclean 2>/dev/null || true
    
    echo "Configuring FFmpeg with explicit emcc..."
    
    # CRITICAL: Set all compiler variables explicitly
    export CC="emcc"
    export CXX="em++"
    export AR="emar"
    export RANLIB="emranlib"
    export LD="emcc"
    export NM="llvm-nm"
    export STRIP="true"  # Don't strip
    
    ./configure \
        --prefix="$FFMPEG_DIR" \
        --cc="emcc" \
        --cxx="em++" \
        --ar="emar" \
        --ranlib="emranlib" \
        --nm="llvm-nm" \
        --enable-cross-compile \
        --target-os=none \
        --arch=x86 \
        --cpu=generic \
        --disable-x86asm \
        --disable-inline-asm \
        --disable-asm \
        --disable-stripping \
        --disable-programs \
        --disable-doc \
        --disable-debug \
        --disable-runtime-cpudetect \
        --disable-autodetect \
        --disable-everything \
        --disable-network \
        --disable-pthreads \
        --disable-w32threads \
        --disable-os2threads \
        --disable-zlib \
        --disable-bzlib \
        --disable-lzma \
        --disable-iconv \
        --enable-small \
        --enable-demuxer=mov \
        --enable-decoder=h264 \
        --enable-decoder=hevc \
        --enable-decoder=aac \
        --enable-decoder=mp3 \
        --enable-decoder=pcm_s16le \
        --enable-decoder=pcm_s16be \
        --enable-parser=h264 \
        --enable-parser=hevc \
        --enable-parser=aac \
        --enable-protocol=file \
        --extra-cflags="-O3" \
        --extra-ldflags="-O3"
    
    echo "Building FFmpeg..."
    # Use emmake to ensure make uses emscripten
    emmake make -j$(sysctl -n hw.ncpu 2>/dev/null || nproc 2>/dev/null || echo 4)
    emmake make install
    
    echo "Verifying WASM output..."
    file "$FFMPEG_DIR/lib/libavformat.a"
fi

# Build untrunc
mkdir -p "$BUILD_DIR"
cd "$BUILD_DIR"

echo ""
echo "=== Compiling Untrunc ==="

UNTRUNC_SRC="$PROJECT_ROOT/src"

em++ \
    -std=c++17 \
    -O3 \
    -D_FILE_OFFSET_BITS=64 \
    -DUNTR_VERSION=\"wasm\" \
    -I"$UNTRUNC_SRC" \
    -I"$FFMPEG_DIR/include" \
    "$UNTRUNC_SRC/atom.cpp" \
    "$UNTRUNC_SRC/codec.cpp" \
    "$UNTRUNC_SRC/common.cpp" \
    "$UNTRUNC_SRC/file.cpp" \
    "$UNTRUNC_SRC/mp4.cpp" \
    "$UNTRUNC_SRC/mutual_pattern.cpp" \
    "$UNTRUNC_SRC/track.cpp" \
    "$UNTRUNC_SRC/avc1/avc-config.cpp" \
    "$UNTRUNC_SRC/avc1/avc1.cpp" \
    "$UNTRUNC_SRC/avc1/nal.cpp" \
    "$UNTRUNC_SRC/avc1/nal-slice.cpp" \
    "$UNTRUNC_SRC/avc1/sps-info.cpp" \
    "$UNTRUNC_SRC/hvc1/hvc1.cpp" \
    "$UNTRUNC_SRC/hvc1/nal.cpp" \
    "$UNTRUNC_SRC/hvc1/nal-slice.cpp" \
    "$SCRIPT_DIR/untrunc_wasm.cpp" \
    -L"$FFMPEG_DIR/lib" \
    -lavformat -lavcodec -lavutil \
    --bind \
    -s WASM=1 \
    -s ALLOW_MEMORY_GROWTH=1 \
    -s INITIAL_MEMORY=268435456 \
    -s MAXIMUM_MEMORY=4294967296 \
    -s MODULARIZE=1 \
    -s EXPORT_NAME="createUntruncModule" \
    -s ENVIRONMENT="web,worker" \
    -s FORCE_FILESYSTEM=1 \
    -s "EXPORTED_RUNTIME_METHODS=['FS','MEMFS','ccall','cwrap']" \
    -lworkerfs.js \
    -s NO_EXIT_RUNTIME=1 \
    -o untrunc.js

mkdir -p "$OUTPUT_DIR"
cp untrunc.js "$OUTPUT_DIR/"
cp untrunc.wasm "$OUTPUT_DIR/"

echo ""
echo "=== Build Complete ==="
ls -lh "$OUTPUT_DIR/untrunc.js" "$OUTPUT_DIR/untrunc.wasm"
