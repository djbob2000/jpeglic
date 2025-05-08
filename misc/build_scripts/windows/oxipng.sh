#!/bin/bash

OXIPNG_TAG="v9.1.4"
RUN_DIR=$(pwd)
OUTPUT_DIR="${RUN_DIR}/bin/win/oxipng"
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
    mingw-w64-x86_64-rust
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
git clone --depth 1 -b "${OXIPNG_TAG}" https://github.com/shssoichiro/oxipng.git oxipng
cd oxipng/
cargo build --release --target x86_64-pc-windows-gnu

mkdir -p "${OUTPUT_DIR}"
cp target/x86_64-pc-windows-gnu/release/oxipng.exe "${OUTPUT_DIR}"
cd "${OUTPUT_DIR}"

rm -rf "${TEMP_DIR}"
echo "Binaries copied to: ${OUTPUT_DIR}"