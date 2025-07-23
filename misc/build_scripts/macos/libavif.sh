#!/bin/bash
set -euo pipefail

LIBAVIF_TAG="v1.3.0"
LIVYUV_COMMIT="4db2af62d"        # Update this commit hash when changing LIBAVIF_TAG. It can be found in libavif/ext/libyuv.cmd
AOM_AV1_TAG="v3.12.1"
SVT_AV1_PSY_TAG="v3.0.2"

RUN_DIR=$(pwd)
OUTPUT_DIR="${RUN_DIR}/bin/macos/libavif"
TEMP_DIR=$(mktemp -d)
SCRIPT_DIR="$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" && pwd )"

source "${SCRIPT_DIR}/_shared.sh"
trap 'cleanup "${TEMP_DIR}"' EXIT
check_env
check_commands \
    git
check_packages \
    ninja \
    jpeg-turbo \
    cmake \
    make \
    nasm \
    libxml2 \
    webp \
    zlib \
    libpng
# webp comes with libsharpyuv

# Prepare repo
cd "${TEMP_DIR}"
git clone --depth 1 -b "${LIBAVIF_TAG}" https://aomedia.googlesource.com/libavif

# Update deps.
cd libavif/ext/

# Build aom
git clone -b "${AOM_AV1_TAG}" --depth 1 https://aomedia.googlesource.com/aom aom
for arch in x86_64 arm64; do
    cmake -G Ninja \
        -S aom \
        -B "aom/build.libaom.${arch}" \
        -DCMAKE_OSX_DEPLOYMENT_TARGET=11.0 \
        -DAOM_TARGET_CPU="${arch}" \
        -DCMAKE_C_COMPILER="/opt/local/bin/clang-mp-17" \
        -DCMAKE_CXX_COMPILER="/opt/local/bin/clang++-mp-17" \
        -DBUILD_SHARED_LIBS=OFF \
        -DCONFIG_PIC=1 \
        -DCMAKE_BUILD_TYPE=Release \
        -DENABLE_DOCS=0 \
        -DENABLE_EXAMPLES=0 \
        -DENABLE_TESTDATA=0 \
        -DENABLE_TESTS=0 \
        -DENABLE_TOOLS=0
    cmake --build aom/build.libavif --config Release --parallel
done
mkdir aom/build.libaom
lipo -create \
    aom/build.libavif.x86_64/libaom.a \
    aom/build.libavif.arm64/libaom.a \
    -output aom/build.libaom/libaom.a

# Build svt-av1-psy
git clone -b "${SVT_AV1_PSY_TAG}" --depth 1 https://github.com/psy-ex/svt-av1-psy.git SVT-AV1
cd SVT-AV1
for arch in x86_64 arm64; do
    cd Build/linux
    ./build \
        -cc="/opt/local/bin/clang-mp-17" \
        -cxx="/opt/local/bin/clang++-mp-17" \
        --gen=Ninja \
        --target_system="${arch}" \
        disable-native \
        release \
        static \
        no-apps \
        -- \
        -DCMAKE_OSX_DEPLOYMENT_TARGET=11.0

    cd ../..
    mkdir -p "build.svtav1.${arch}"
    cp "Bin/Release/libSvtAv1Enc.a" "build.svtav1.${arch}/"
done

mkdir -p Bin/Release
lipo -create \
    build.svtav1.x86_64/libSvtAv1Enc.a \
    build.svtav1.arm64/libSvtAv1Enc.a \
    -output Bin/Release/libSvtAv1Enc.a

cp Source/API/*.h include/svt-av1

# Build libyuv
git clone --single-branch https://chromium.googlesource.com/libyuv/libyuv
cd libyuv
# Commit id from libavif/ext/libyuv.cmd
git checkout "${LIVYUV_COMMIT}"
cd ..

cmake -G Ninja \
    -S libyuv \
    -B libyuv/build \
    -DCMAKE_BUILD_TYPE=Release \
    -DCMAKE_POSITION_INDEPENDENT_CODE=OFF \
    -DCMAKE_OSX_DEPLOYMENT_TARGET=11.0 \
    -DCMAKE_C_COMPILER="/opt/local/bin/clang-mp-17" \
    -DCMAKE_CXX_COMPILER="/opt/local/bin/clang++-mp-17" \
    -DCMAKE_PREFIX_PATH="/opt/local" \
    -DJPEG_LIBRARY="/opt/local/lib/libjpeg.a" \
    -DJPEG_INCLUDE_DIR="/opt/local/include" \
    -DCMAKE_OSX_ARCHITECTURES="arm64;x86_64"
cmake --build libyuv/build --config Release --target yuv --parallel

# Build libavif
# One arch at a time because doing both with -DCMAKE_OSX_ARCHITECTURES will make compilation fail.
for arch in x86_64 arm64; do
    build_dir="${TEMP_DIR}/build-${arch}"
    mkdir -p "${build_dir}"
    cd "${build_dir}"

    # Library paths are hardcoded because .dylib get prioritized over .a.
    cmake -G Ninja \
        -DCMAKE_OSX_DEPLOYMENT_TARGET=11.0 \
        -DCMAKE_C_COMPILER="/opt/local/bin/clang-mp-17" \
        -DCMAKE_CXX_COMPILER="/opt/local/bin/clang++-mp-17" \
        -DCMAKE_PREFIX_PATH="/opt/local" \
        -DCMAKE_OSX_ARCHITECTURES="${arch}" \
        -DCMAKE_BUILD_TYPE=Release \
        -DBUILD_SHARED_LIBS=0 \
        -DAVIF_BUILD_APPS=1 \
        -DAVIF_LIBYUV=LOCAL \
        -DAVIF_LIBSHARPYUV=SYSTEM \
        -DLIBSHARPYUV_LIBRARY="/opt/local/lib/libsharpyuv.a" \
        -DLIBSHARPYUV_INCLUDE_DIR="/opt/local/include/webp" \
        -DAVIF_JPEG=SYSTEM \
        -DJPEG_LIBRARY="/opt/local/lib/libjpeg.a" \
        -DJPEG_INCLUDE_DIR="/opt/local/include" \
        -DAVIF_ZLIBPNG=SYSTEM \
        -DZLIB_LIBRARY="/opt/local/lib/libz.a" \
        -DZLIB_INCLUDE_DIR="/opt/local/include" \
        -DPNG_LIBRARY="/opt/local/lib/libpng.a" \
        -DPNG_INCLUDE_DIR="/opt/local/include" \
        -DAVIF_LIBXML2=SYSTEM \
        -DLIBXML2_LIBRARY="/opt/local/lib/libxml2.a" \
        -DLIBXML2_INCLUDE_DIR="/opt/local/include" \
        -DAVIF_CODEC_SVT=LOCAL \
        -DAVIF_CODEC_AOM=LOCAL \
        -DCMAKE_POLICY_VERSION_MINIMUM=3.5 \
        "${TEMP_DIR}/libavif"

    ninja avifenc avifdec
done

mkdir -p "${OUTPUT_DIR}"
for binary in avifenc avifdec; do
    lipo -create \
        "${TEMP_DIR}/build-x86_64/${binary}" \
        "${TEMP_DIR}/build-arm64/${binary}" \
        -output "${OUTPUT_DIR}/${binary}"
done
echo "Binaries copied to: ${OUTPUT_DIR}"
