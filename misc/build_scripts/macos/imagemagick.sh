#!/bin/bash
set -euo pipefail

IMAGEMAGICK_TAG="7.1.1-46"
LIBHEIF_TAG="v1.19.7"
RUN_DIR=$(pwd)
OUTPUT_DIR="${RUN_DIR}/bin/macos/imagemagick"
TEMP_DIR=$(mktemp -d)
SCRIPT_DIR="$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" && pwd )"

source "${SCRIPT_DIR}/_shared.sh"
trap 'cleanup "${TEMP_DIR}"' EXIT

check_env
check_packages \
    pkgconf \
    libomp \
    imath \
    glib \
    gettext \
    webp \
    openjpeg \
    little-cms2 \
    fontconfig \
    freetype \
    jpeg-turbo \
    jpeg-xl \
    libheif \
    liblqr \
    libpng \
    libtiff \
    libtool

# Build
git clone --depth 1 -b "${IMAGEMAGICK_TAG}" https://github.com/ImageMagick/ImageMagick.git "${TEMP_DIR}/ImageMagick"
cd "${TEMP_DIR}/ImageMagick/"
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
make -j$(sysctl -n hw.logicalcpu)

# Bundle
mkdir -p "${OUTPUT_DIR}"
cp ./utilities/magick "${OUTPUT_DIR}"
echo "Binaries copied to: ${OUTPUT_DIR}"
