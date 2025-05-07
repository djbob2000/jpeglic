#!/bin/bash
# Compatible with Linux Bash and MSYS2

EXIFTOOL_TAG="13.25"
OUTPUT_DIR="./bin/win/exiftool"

set -e

# Requires: wget, p7zip-full

mkdir "$OUTPUT_DIR"
cd "$OUTPUT_DIR"
wget "https://exiftool.org/exiftool-${EXIFTOOL_TAG}_64.zip" -O exiftool.zip
7z x exiftool.zip
cd "exiftool-${EXIFTOOL_TAG}_64"
mv "exiftool(-k).exe" exiftool.exe
rm -f ./exiftool_files/Licenses_Strawberry_Perl.zip     # 0.5 MB saved
rm -f ./README.txt