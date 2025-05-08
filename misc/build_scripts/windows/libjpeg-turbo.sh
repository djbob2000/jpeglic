#!/bin/bash

LIBJPEG_TURBO_TAG="3.1.0"
MT_PATH="/c/Program Files (x86)/Windows Kits/10/bin/10.0.20348.0/x64/mt.exe"   # `cmd /c ""C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvars64.bat" & where mt"`
RUN_DIR=$(pwd)
OUTPUT_DIR="${RUN_DIR}/bin/jpegtran"
TEMP_DIR=$(mktemp -d)

set -e

# Verify prerequisites
if [ "${MSYSTEM}" != "MINGW64" ]; then
    echo "MSYS2 MINGW64 environment is required to run this script."
    exit 1
fi

if [ ! -f "${MT_PATH}" ]; then
    echo "mt.exe not found. Install Windows SDK through Visual Studio, change MT_PATH in this script, and try again."
    exit 1
fi

required_packages=(
    git
    cmake
    mingw-w64-x86_64-ninja
    mingw-w64-x86_64-nasm
    mingw-w64-x86_64-gcc
    mingw-w64-x86_64-make
)
# If your cmake (mingw-w64-x86_64-cmake) is broken and returns no output -- install the generic one with: pacman -S cmake
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
git clone --depth 1 -b "${LIBJPEG_TURBO_TAG}" https://github.com/libjpeg-turbo/libjpeg-turbo.git
cd libjpeg-turbo/
mkdir build && cd build/
cmake -G "Unix Makefiles" \
    -DCMAKE_BUILD_TYPE=Release \
    -DENABLE_STATIC=TRUE \
    ..
make
# make -j$(nproc)

# Bundle
mkdir -p "${OUTPUT_DIR}"
cp jpegtran-static.exe "${OUTPUT_DIR}/jpegtran.exe"
cd "${OUTPUT_DIR}"

find . -type f -name "*.exe" | while read -r exe; do
    ldd "${exe}" | awk '/\/mingw64\// {print $3}' | while read -r dll; do
        if [ ! -f "./$(basename "${dll}")" ]; then
            cp "${dll}" .
        fi
    done
done

# Run mt.exe
cat <<EOF > "${TEMP_DIR}/manifest.xml"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<assembly manifestVersion="1.0" xmlns="urn:schemas-microsoft-com:asm.v1">
    <application>
    <windowsSettings>
        <activeCodePage xmlns="http://schemas.microsoft.com/SMI/2019/WindowsSettings">UTF-8</activeCodePage>
    </windowsSettings>
    </application>
</assembly>
EOF
# Convert LF to CRLF
sed -i "s/$/\r/" "${TEMP_DIR}/manifest.xml"
find "${OUTPUT_DIR}" -type f -name "*.exe" | while read -r exe; do
    "${MT_PATH}" -manifest "${TEMP_DIR}/manifest.xml" -outputresource:"${exe}";#1
done

rm -rf "${TEMP_DIR}"
echo "Binaries copied to: ${OUTPUT_DIR}"