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
    jpeg-turbo \
    libpng \
    ninja \
    zlib \
    brotli

# Build
git clone --depth 1 -b "${LIBJXL_TAG}" https://github.com/libjxl/libjxl.git "${TEMP_DIR}/libjxl"
cd "${TEMP_DIR}/libjxl"
./deps.sh
mkdir build && cd build/
export CMAKE_PREFIX_PATH=`brew --prefix giflib`:`brew --prefix jpeg-turbo`:`brew --prefix libpng`:`brew --prefix zlib`:`brew --prefix brotli`
cmake -G Ninja \
    -DCMAKE_BUILD_TYPE=Release \
    -DBUILD_TESTING=OFF \
    -DBUILD_SHARED_LIBS=OFF \
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
    ..
ninja

# Bundle
mkdir -p "${OUTPUT_DIR}"
cd "${TEMP_DIR}/libjxl/build/tools"
cp cjpegli cjxl djxl jxlinfo "${OUTPUT_DIR}"
echo "Binaries copied to: ${OUTPUT_DIR}"
