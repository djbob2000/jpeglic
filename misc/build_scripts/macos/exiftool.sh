#!/bin/bash
set -euo pipefail

EXIFTOOL_TAG="13.37"

RUN_DIR=$(pwd)
OUTPUT_DIR="${RUN_DIR}/bin/macos"
TEMP_DIR=$(mktemp -d)
SCRIPT_DIR="$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" && pwd )"

source "${SCRIPT_DIR}/_shared.sh"
trap 'cleanup "${TEMP_DIR}"' EXIT

check_env
check_commands wget

# Prepare
cd "$TEMP_DIR"
wget "https://exiftool.org/Image-ExifTool-${EXIFTOOL_TAG}.tar.gz" -O "${TEMP_DIR}/exiftool.tar.gz"
mkdir "${TEMP_DIR}/exiftool"
tar -xzvf exiftool.tar.gz -C "${TEMP_DIR}/exiftool" --strip-components=1

# Move
mkdir -p "$OUTPUT_DIR"
mv "${TEMP_DIR}/exiftool" "${OUTPUT_DIR}"
