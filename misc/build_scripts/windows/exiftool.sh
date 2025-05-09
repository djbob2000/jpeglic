#!/bin/bash
# Compatible with Linux Bash and MSYS2

EXIFTOOL_TAG="13.25"

RUN_DIR=$(pwd)
OUTPUT_DIR="${RUN_DIR}/bin/win/exiftool"
TMP_DIR=$(mktemp -d)

cleanup() {
    echo "Cleaning up..."
    cd "${RUN_DIR}"
    rm -rf "${TEMP_DIR}"
}
trap cleanup EXIT

set -e

# Check pre-requisites
for cmd in wget 7z; do
    if ! command -v "$cmd" &> /dev/null; then
        echo "Error: Command \"${cmd}\" is not available."
        echo "Install it and run the script again."
        exit 1
    fi
done

# Prepare
rm -rf "$TMP_DIR"
mkdir -p "$TMP_DIR"
cd "$TMP_DIR"
wget "https://exiftool.org/exiftool-${EXIFTOOL_TAG}_64.zip" -O exiftool.zip
7z x exiftool.zip
cd "exiftool-${EXIFTOOL_TAG}_64"
mv "exiftool(-k).exe" exiftool.exe
rm -f ./exiftool_files/Licenses_Strawberry_Perl.zip     # 0.5 MB saved
rm -f ./README.txt

# Move
cd "$RUN_DIR"
mkdir -p "$OUTPUT_DIR"
mv "${TMP_DIR}"/exiftool-"${EXIFTOOL_TAG}"_64/* "${OUTPUT_DIR}"