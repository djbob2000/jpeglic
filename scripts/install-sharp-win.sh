#!/bin/bash
set -e

# Script to install Windows sharp binaries on non-Windows platforms
# This is needed for cross-platform builds

echo "Installing Windows sharp binaries..."

# Download and extract sharp-win32-x64
echo "Processing sharp-win32-x64..."
npm pack @img/sharp-win32-x64@0.34.5
mkdir -p node_modules/@img/sharp-win32-x64
tar -xzf img-sharp-win32-x64-0.34.5.tgz -C node_modules/@img/sharp-win32-x64 --strip-components=1
rm img-sharp-win32-x64-0.34.5.tgz

# Download and extract sharp-libvips-win32-x64
echo "Processing sharp-libvips-win32-x64..."
npm pack @img/sharp-libvips-win32-x64@1.2.4
mkdir -p node_modules/@img/sharp-libvips-win32-x64
tar -xzf img-sharp-libvips-win32-x64-1.2.4.tgz -C node_modules/@img/sharp-libvips-win32-x64 --strip-components=1
rm img-sharp-libvips-win32-x64-1.2.4.tgz

echo "Windows sharp binaries installed successfully!"
