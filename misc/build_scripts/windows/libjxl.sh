#!/bin/bash

LIBJXL_TAG="v0.11.1"
RUN_DIR=$(pwd)
OUTPUT_DIR="${RUN_DIR}/bin/win/libjxl"
TEMP_DIR=$(mktemp -d)
SCRIPT_DIR="$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" && pwd )"

source "${SCRIPT_DIR}/_shared.sh"

trap 'cleanup "${TEMP_DIR}"' EXIT
set -euo pipefail
check_msys2
check_packages \
    git \
    base-devel \
    mingw-w64-x86_64-toolchain \
    mingw-w64-x86_64-cmake \
    mingw-w64-x86_64-ninja \
    mingw-w64-x86_64-gtest \
    mingw-w64-x86_64-giflib \
    mingw-w64-x86_64-libpng \
    mingw-w64-x86_64-libjpeg-turbo

# Build
cd "${TEMP_DIR}"
git clone --depth 1 -b "${LIBJXL_TAG}" https://github.com/libjxl/libjxl.git libjxl
cd libjxl/
./deps.sh
mkdir build && cd build/
cmake -DCMAKE_BUILD_TYPE=Release \
    -DBUILD_TESTING=OFF \
    -DBUILD_SHARED_LIBS=OFF \
    -DJPEGXL_ENABLE_BENCHMARK=OFF \
    -DJPEGXL_ENABLE_PLUGINS=OFF \
    -DJPEGXL_ENABLE_MANPAGES=OFF \
    -DJPEGXL_FORCE_SYSTEM_BROTLI=ON \
    -DJPEGXL_FORCE_SYSTEM_GTEST=ON \
    -DJPEGXL_ENABLE_TOOLS=ON \
    -DJPEGXL_ENABLE_OPENEXR=OFF \
    -DJPEGXL_ENABLE_JPEGLI_LIBJPEG=OFF \
    -DJPEGXL_ENABLE_TCMALLOC=OFF \
    -DJPEGXL_ENABLE_VIEWERS=OFF \
    -DJPEGXL_ENABLE_DEVTOOLS=OFF \
    -DCMAKE_POLICY_VERSION_MINIMUM=3.5 \
    ..
cmake --build .

# Bundle
mkdir -p "${OUTPUT_DIR}"
cd tools/
cp cjpegli.exe cjxl.exe djxl.exe jxlinfo.exe "${OUTPUT_DIR}"
bundle_dlls "${OUTPUT_DIR}"
echo "Binaries copied to: ${OUTPUT_DIR}"