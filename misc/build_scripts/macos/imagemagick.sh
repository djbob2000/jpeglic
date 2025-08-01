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
    glib2 \
    gettext \
    webp \
    openjpeg \
    lcms2 \
    fontconfig \
    freetype \
    libjpeg-turbo \
    libjxl \
    libheif \
    liblqr \
    libpng \
    tiff \
    libtool

# Build
git clone --depth 1 -b "${IMAGEMAGICK_TAG}" https://github.com/ImageMagick/ImageMagick.git "${TEMP_DIR}/ImageMagick"
build_dirs=()
for arch in x86_64 arm64; do
    build_dir="${TEMP_DIR}/build-${arch}"
    build_dirs+=("${build_dir}")

    mkdir -p "${build_dir}"
    cd "${build_dir}"

    case "${arch}" in
        x86_64)
            export CC="/opt/local/bin/clang-mp-17 -arch x86_64"
            export CXX="/opt/local/bin/clang++-mp-17 -arch x86_64"
            ;;
        arm64)
            export CC="/opt/local/bin/clang-mp-17 -arch arm64"
            export CXX="/opt/local/bin/clang++-mp-17 -arch arm64"
            ;;
    esac

    # --enable-static has to stay because it prevents libMagickCore-7.Q16HDRI.10.dylib and libMagickWand-7.Q16HDRI.10.dylib from being created. They are a hassle to bundle.
    "${TEMP_DIR}/ImageMagick/configure" \
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
        --without-jbig \
        --host="${arch}-apple-darwin"

    make -j$(sysctl -n hw.logicalcpu)
done

# Combine binaries
mkdir -p "${OUTPUT_DIR}"
mkdir -p "${OUTPUT_DIR}/lib"
lipo -create \
    "${build_dirs[0]}/utilities/magick" \
    "${build_dirs[1]}/utilities/magick" \
    -output "${OUTPUT_DIR}/magick"

bundle_binary() {
    local binary="$1"
    local lib_dir="$2"
    
    for dep in $(otool -L "${binary}" | sed 1d | awk '{print $1}' | grep '^/'); do
        # Skip system libs and if already using @loader_path
        if [[  "${dep}" == /usr/lib/*   ||
                "${dep}" == /System/*   ||
                "${dep}" == @loader_path*   ]]; then
            continue
        fi

        local lib_name=$(basename "${dep}")
        local lib_target="${lib_dir}/${lib_name}"

        # Copy if not present already
        if [[ ! -f "${lib_target}" ]]; then
            # Find deps and update search path
            if [[ -f "${dep}" ]]; then
                cp "${dep}" "${lib_target}"
            else
                # Fallback for outdated paths when deps cannot be found
                for search_path in /opt/local/lib /usr/local/lib; do
                    if [[ -f "${search_path}/${lib_name}" ]]; then
                        cp "${search_path}/${lib_name}" "${lib_target}"
                        break
                    fi
                done
            fi
            chmod +w "${lib_target}"
            install_name_tool -id "@loader_path/${lib_name}" "${lib_target}"
        fi

        if [[ "${binary}" == *.dylib ]]; then
            install_name_tool -change "${dep}" "@loader_path/${lib_name}" "${binary}"
        else
            install_name_tool -change "${dep}" "@executable_path/lib/${lib_name}" "${binary}"
        fi

        bundle_binary "${lib_target}" "${lib_dir}"
    done
}

update_ids() {
    local lib_dir="$1"
    for dylib in "${lib_dir}"/*.dylib; do
        [[ -f "${dylib}" ]] || continue
        install_name_tool -id "@loader_path/$(basename "${dylib}")" "${dylib}"
    done
}

warning() {
    printf '\033[33m%b\033[0m\n' "$*"
}

validate() {
    # Main executable
    local exe_deps=$(otool -L "${OUTPUT_DIR}/magick" \
        | sed 1d \
        | awk '{print $1}' \
        | grep '^/' \
        | grep -Ev '^/(usr/lib/|System)' \
        || true)

    if [[ -n "${exe_deps}" ]]; then
        warning "Warning: The magick binary has external dependencies. It will not work on another system."
    fi

    # lib
    local has_external=false
    for dylib in "${OUTPUT_DIR}/lib/"*.dylib; do
        local dylib_deps=$(otool -L "${dylib}" \
            | sed 1d \
            | awk '{print $1}' \
            | grep '^/' \
            | grep -Ev '^/(usr/lib/|System)' \
            || true)
        if [[ -n "${dylib_deps}" ]]; then
            has_external=true
        fi
    done

    if [[ "${has_external}" == "true" ]]; then
        warning "Warning: External dependencies present. This bundle will not work on another system."
    fi
}

bundle_binary "${OUTPUT_DIR}/magick" "${OUTPUT_DIR}/lib"
update_ids "${OUTPUT_DIR}/lib"
validate

echo "Build artifacts copied to: ${OUTPUT_DIR}"
