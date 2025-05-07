#!/bin/bash

LIBAVIF_TAG="v1.2.1"
AOM_AV1_TAG="v3.12.0"
SVT_AV1_PSY_TAG="v2.3.0-B"

RUN_DIR=$(pwd)
OUTPUT_DIR="${RUN_DIR}/bin/libavif"
TEMP_DIR=$(mktemp -d)

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
    mingw-w64-x86_64-ninja
    mingw-w64-x86_64-libjpeg-turbo
    cmake
    make
    nasm
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

# Prepare repo
cd "${TEMP_DIR}"
git clone --depth 1 -b "${LIBAVIF_TAG}" https://aomedia.googlesource.com/libavif

# Update deps.
cd libavif/ext/
sed -i -E "s/v[0-9]+\.[0-9]+\.[0-9]+/${AOM_AV1_TAG}/" aom.cmd
sed -i -E "s#https://gitlab.com/AOMediaCodec/SVT-AV1\.git#https://github.com/psy-ex/svt-av1-psy.git SVT-AV1#" svt.sh
sed -i -E "s/v[0-9]+\.[0-9]+\.[0-9]+/${SVT_AV1_PSY_TAG}/" svt.sh

# Build deps.
sed -i "/cmake.*\.\./ s/\.\./-DCMAKE_POLICY_VERSION_MINIMUM=3.5 &/" libyuv.cmd      # Fix libyuv.cmd
./libyuv.cmd
./libsharpyuv.cmd
./libjpeg.cmd
./zlibpng.cmd
./svt.sh
./aom.cmd

# Build libavif
cd "${TEMP_DIR}/libavif"
mkdir build && cd build/
cmake \
    -DCMAKE_BUILD_TYPE=Release \
    -DBUILD_SHARED_LIBS=0 \
    -DAVIF_BUILD_APPS=1 \
    -DAVIF_LIBYUV=LOCAL \
    -DAVIF_LIBSHARPYUV=LOCAL \
    -DAVIF_JPEG=LOCAL \
    -DAVIF_ZLIBPNG=LOCAL \
    -DAVIF_CODEC_SVT=LOCAL \
    -DAVIF_CODEC_AOM=LOCAL \
    -DCMAKE_POLICY_VERSION_MINIMUM=3.5 \
    ..
cmake --build . --parallel

# Bundle
mkdir -p "${OUTPUT_DIR}"
cp avifenc.exe avifdec.exe "${OUTPUT_DIR}"
cd "${OUTPUT_DIR}"

find . -type f -name "*.exe" | while read -r exe; do
    ldd "${exe}" | awk '/\/mingw64\// {print $3}' | while read -r dll; do
        if [ ! -f "./$(basename "${dll}")" ]; then
            cp "${dll}" .
        fi
    done
done

# Clean up
rm -rf "${TEMP_DIR}"

echo "Binaries copied to: ${OUTPUT_DIR}"