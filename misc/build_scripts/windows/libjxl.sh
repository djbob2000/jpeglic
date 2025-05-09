#!/bin/bash

LIBJXL_TAG="v0.11.1"
RUN_DIR=$(pwd)
OUTPUT_DIR="${RUN_DIR}/bin/win/libjxl"
TEMP_DIR=$(mktemp -d)

cleanup() {
    echo "Cleaning up..."
    cd "${RUN_DIR}"
    rm -rf "${TEMP_DIR}"
}
trap cleanup EXIT

set -e

# Verify prerequisites
if [ "${MSYSTEM}" != "MINGW64" ]; then
    echo "MSYS2 MINGW64 environment is required to run this script."
    exit 1
fi

required_packages=(
    git
    base-devel
    mingw-w64-x86_64-toolchain
    mingw-w64-x86_64-cmake
    mingw-w64-x86_64-ninja
    mingw-w64-x86_64-gtest
    mingw-w64-x86_64-giflib
    mingw-w64-x86_64-libpng
    mingw-w64-x86_64-libjpeg-turbo
)
installed_packages=$(pacman -Q 2>/dev/null)
installed_groups=$(pacman -Qg 2>/dev/null)
missing_packages="false"
missing_package_list=()

for pkg in "${required_packages[@]}"; do
    if ! echo "${installed_packages}" | grep -q "^${pkg}" && \
        ! echo "${installed_groups}" | grep -q "^${pkg}"; then
        missing_packages="true"
        missing_package_list+=("${pkg}")
    fi
done

if [ "${missing_packages}" = "true" ]; then
    echo -e "Missing packages.\nInstall the following packages and try again:\n${missing_package_list[@]}"
    exit 1
fi

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
cd "${OUTPUT_DIR}"

find . -type f -name "*.exe" | while read -r exe; do
    ldd "${exe}" | awk '/\/mingw64\// {print $3}' | while read -r dll; do
        if [ ! -f "./$(basename "${dll}")" ]; then
            cp "${dll}" .
        fi
    done
done

echo "Binaries copied to: ${OUTPUT_DIR}"