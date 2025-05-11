#!/bin/bash

# Config
# Note: Remember to use the latest vc_redist and a supported version of Python.
PYINSTALLER_TAG="v6.11.1"
RUN_TESTS="True"
FORCE_CLEAN="False"
PYTHON_PATH="${LOCALAPPDATA}/Programs/Python/Python313/python.exe"
INNOSETUP_PATH="/c/Program Files (x86)/Inno Setup 6/ISCC.exe"

RUN_DIR=$(pwd)
TEMP_DIR=$(mktemp -d)
SCRIPT_DIR="$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" && pwd )"
ENV_BUILD="${RUN_DIR}/env_build"
ENV_DEV="${RUN_DIR}/env_dev"
PYINSTALLER_DIR="${RUN_DIR}/misc/pyinstaller"

source "${SCRIPT_DIR}/_shared.sh"

# Verify prerequisites
trap 'cleanup "${TEMP_DIR}"' EXIT
set -euo pipefail
check_msys2
check_packages \
    git \
    base-devel \
    mingw-w64-x86_64-toolchain \
    cmake
check_commands \
    7z

# Check Python
if [ ! -f "$PYTHON_PATH" ]; then
    echo "Python EXE not found in PYTHON_PATH."
    exit 1
fi

python -c "import sys; assert sys.version_info >= (3, 12) and sys.version_info < (3, 14)" || {
    echo "Version mismatch. Python 3.13 or 3.12 is required. Current version: $(${PYTHON_PATH} --version 2>&1)"
    exit 1
}

# Check InnoSetup
if [ ! -f "$INNOSETUP_PATH" ]; then
    echo "InnoSetup not found at INNOSETUP_PATH"
    exit 1
fi

# Clean
if [ "$FORCE_CLEAN" = "True" ]; then
    echo "Cleaning up files from previous builds..."
    rm -rf "$ENV_BUILD" "$ENV_DEV" "$PYINSTALLER_DIR"
fi

# Setup environments
if [ "$RUN_TESTS" = "True" ]; then
    if [ ! -d "$ENV_DEV" ]; then
        echo "Creating dev environment..."
        "$PYTHON_PATH" -m venv "$ENV_DEV"
    fi
    source "${ENV_DEV}/Scripts/activate"
    pip install -r requirements.txt -r requirements_test.txt
    python test.py
    python test_convert.py
fi

if [ ! -d "$ENV_BUILD" ]; then
    echo "Creating build environment..."
    "$PYTHON_PATH" -m venv "$ENV_BUILD"
fi
source "${ENV_BUILD}/Scripts/activate"
pip install -r requirements.txt

# Setup PyInstaller
if ! pip show pyinstaller &> /dev/null; then
    echo "Setting up PyInstaller..."
    if [ ! -d "$PYINSTALLER_DIR" ]; then
        git clone -b "$PYINSTALLER_TAG" --depth 1 https://github.com/pyinstaller/pyinstaller.git "${PYINSTALLER_DIR}"
    fi
    cd "${PYINSTALLER_DIR}/bootloader"
    python waf all --gcc
    cd "${PYINSTALLER_DIR}"
    pip install .
fi

# Building
echo "Building..."
cd "$RUN_DIR"
mkdir -p "${TEMP_DIR}/dist"
python build.py -b portable
mv "${RUN_DIR}/dist/"*.7z "${TEMP_DIR}/dist"
python build.py -b innosetup -u
cd "${RUN_DIR}/dist"
"$INNOSETUP_PATH" install.iss
mv "${RUN_DIR}/dist/Output/"*.exe "${TEMP_DIR}/dist"
mv "${RUN_DIR}/dist/"*.json "${TEMP_DIR}/dist"
rm -rf "${RUN_DIR}/dist/"*
mv "${TEMP_DIR}/dist/"* "${RUN_DIR}/dist"
