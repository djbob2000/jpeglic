#!/bin/bash

IMAGEMAGICK_TAG="7.1.1-46"
LIBHEIF_TAG="v1.19.7"
RUN_DIR=$(pwd)
OUTPUT_DIR="${RUN_DIR}/bin/win/imagemagick"
TEMP_DIR=$(mktemp -d)

cleanup() {
    echo "Cleaning up ${TEMP_DIR}"
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
    mingw-w64-x86_64-imagemagick
    mingw-w64-x86_64-libjxl
    mingw-w64-x86_64-aom
    cmake
    autoconf
    automake
    libtool
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

# Compile libheif without proprietary standards (like HEVC) to avoid licensing issues.
# This was very tricky to get working. Expect things to break. `magick -list format` can be wrong. Use `ldd` for debugging.
# I've spent multiple hours on this. Do not mess with it without a good reason. The integration can and will break.
cd "${TEMP_DIR}"
git clone --depth 1 -b "${LIBHEIF_TAG}" https://github.com/strukturag/libheif.git
cd libheif/
mkdir build && cd build/
cmake -G "MSYS Makefiles" \
    -DCMAKE_INSTALL_PREFIX=/mingw64/ \
    -DCMAKE_BUILD_TYPE=Release \
    -DWITH_KVAZAAR=OFF \
    -DWITH_KVAZAAR_PLUGIN=OFF \
    -DWITH_LIBDE265=OFF \
    -DWITH_LIBDE265_PLUGIN=OFF \
    -DWITH_UVG266=OFF \
    -DWITH_UVG266_PLUGIN=OFF \
    -DWITH_VVDEC=OFF \
    -DWITH_VVDEC_PLUGIN=OFF \
    -DWITH_VVENC=OFF \
    -DWITH_VVENC_PLUGIN=OFF \
    -DWITH_X265=OFF \
    -DWITH_X265_PLUGIN=OFF \
    -DWITH_OPENJPH_ENCODER=OFF \
    -DWITH_OpenH264_DECODER=OFF \
    -DWITH_OpenH264_DECODER_PLUGIN=OFF \
    -DWITH_DAV1D=OFF \
    -DWITH_DAV1D_PLUGIN=OFF \
    -DWITH_EXAMPLES=OFF \
    -DWITH_FFMPEG_DECODER=OFF \
    -DWITH_FFMPEG_DECODER_PLUGIN=OFF \
    -DWITH_RAV1E=OFF \
    -DWITH_RAV1E_PLUGIN=OFF \
    -DWITH_SvtEnc=OFF \
    -DWITH_SvtEnc_PLUGIN=OFF \
    -DWITH_SvtEnc_PLUGIN=OFF \
    -DCMAKE_POLICY_VERSION_MINIMUM=3.5 \
    ..
make -j $(nproc)
make install

# ImageMagick
cd "${SCRIPT_DIR}"
git clone --depth 1 -b "${IMAGEMAGICK_TAG}" https://github.com/ImageMagick/ImageMagick.git ImageMagick
cd ImageMagick/
./configure \
    --enable-static \
    --disable-shared \
    --enable-hdri \
    --with-quantum-depth=16 \
    --with-modules \
    --without-perl \
    --without-magick-plus-plus \
    --with-png \
    --with-jpeg \
    --with-tiff \
    --with-webp \
    --with-jxl \
    --with-zstd \
    --with-bzlib \
    --with-lzma \
    --with-openjp2 \
    --with-heic \
    --without-raw \
    --disable-opencl \
    --without-wmf \
    --without-uhdr \
    --without-djvu \
    --without-openexr \
    --without-raqm \
    --without-jbig
make -j$(nproc)

# Bundle
mkdir -p "${OUTPUT_DIR}"
cp ./utilities/magick "${OUTPUT_DIR}"
cd "${OUTPUT_DIR}"

find . -type f -name "*.exe" | while read -r exe; do
    ldd "${exe}" | awk '/\/mingw64\// {print $3}' | while read -r dll; do
        if [ ! -f "./$(basename "${dll}")" ]; then
            cp "${dll}" .
        fi
    done
done

echo "Binaries copied to: ${OUTPUT_DIR}"