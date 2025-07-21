#!/bin/bash
set -euo pipefail

LIBJXL_TAG="v0.11.1"
RUN_DIR=$(pwd)
OUTPUT_DIR="${RUN_DIR}/bin/macos"
TEMP_DIR=$(mktemp -d)
SCRIPT_DIR="$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" && pwd )"

source "${SCRIPT_DIR}/_shared.sh"
trap 'cleanup "${TEMP_DIR}"' EXIT

check_env
check_commands \
    git
check_packages \
    llvm \
    coreutils \
    cmake \
    giflib \
    libjpeg-turbo \
    libpng \
    ninja \
    zlib \
    brotli

# Build
git clone --depth 1 -b "${LIBJXL_TAG}" https://github.com/libjxl/libjxl.git "${TEMP_DIR}/libjxl"
cd "${TEMP_DIR}/libjxl"
./deps.sh
mkdir build && cd build/

for arch in x86_64 arm64; do
    build_dir="${TEMP_DIR}/build-${arch}"
    mkdir -p "${build_dir}"
    cd "${build_dir}"

    export PKG_CONFIG_PATH="/opt/local/lib/pkgconfig"
    export LDFLAGS="-L/opt/local/lib"
    export CPPFLAGS="-I/opt/local/include"

    cmake -G Ninja \
        -DCMAKE_BUILD_TYPE=Release \
        -DCMAKE_OSX_DEPLOYMENT_TARGET=11.0 \
        -DCMAKE_OSX_ARCHITECTURES="${arch}" \
        -DCMAKE_PREFIX_PATH="/opt/local" \
        -DCMAKE_C_COMPILER="/opt/local/bin/clang-mp-17" \
        -DCMAKE_CXX_COMPILER="/opt/local/bin/clang++-mp-17" \
        -DBUILD_SHARED_LIBS=OFF \
        -DBUILD_TESTING=OFF \
        -DJPEGXL_ENABLE_BENCHMARK=OFF \
        -DJPEGXL_ENABLE_PLUGINS=OFF \
        -DJPEGXL_ENABLE_MANPAGES=OFF \
        -DJPEGXL_FORCE_SYSTEM_BROTLI=OFF \
        -DJPEGXL_FORCE_SYSTEM_GTEST=ON \
        -DJPEGXL_ENABLE_TOOLS=ON \
        -DJPEGXL_ENABLE_OPENEXR=OFF \
        -DJPEGXL_ENABLE_JPEGLI_LIBJPEG=OFF \
        -DJPEGXL_ENABLE_TCMALLOC=OFF \
        -DJPEGXL_ENABLE_VIEWERS=OFF \
        -DJPEGXL_ENABLE_DEVTOOLS=OFF \
        -DCMAKE_POLICY_VERSION_MINIMUM=3.5 \
        -DGIF_LIBRARY="/opt/local/lib/giflib5/lib/libgif.a" \
        -DGIF_INCLUDE_DIR="/opt/local/include/giflib5" \
        -DZLIB_LIBRARY="/opt/local/lib/libz.a" \
        -DZLIB_INCLUDE_DIR="/opt/local/include" \
        -DJPEG_LIBRARY="/opt/local/lib/libjpeg.a" \
        -DJPEG_INCLUDE_DIR="/opt/local/include" \
        -DPNG_LIBRARY="/opt/local/lib/libpng.a" \
        -DPNG_PNG_INCLUDE_DIR="/opt/local/include" \
        "${TEMP_DIR}/libjxl"

    ninja cjxl djxl jxlinfo cjpegli
done

# Bundle
mkdir -p "${OUTPUT_DIR}"
for binary in cjxl djxl jxlinfo cjpegli; do
    lipo -create \
        "${TEMP_DIR}/build-x86_64/tools/${binary}" \
        "${TEMP_DIR}/build-arm64/tools/${binary}" \
        -output "${OUTPUT_DIR}/${binary}"
done

echo "Binaries copied to: ${OUTPUT_DIR}"
