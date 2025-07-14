<div align="center">
    <img src="assets/icons/logo.svg" width="20%">
<h3 align="center">XL Converter</h3>

Easy-to-use image converter for modern formats.

Available for Windows and Linux.

![](misc/images/screenshot_0.png)

Read the [Manual](https://xl-docs.codepoems.eu)
</div>

## Features

#### JPEGLI

Generate fully compatible JPEG images with up to [35% better compression ratio](https://opensource.googleblog.com/2024/04/introducing-jpegli-new-jpeg-coding-library.html).

#### Format Support

Maximize image compression with **JPEG XL** and **AVIF**. Also available: **WebP**, **JPEG**, and **PNG**.

#### Parallel Encoding

Run encoders in parallel for increased throughput.

#### Lossless JPEG Transcoding

Reduce the file size of your JPEG images by 16% - 22% with Lossless JPEG Transcoding. This process is reversible.

#### Downscaling

Scale down images to resolution, percent, shortest (and longest) side, and megapixels.

## Download

[Official website](https://codepoems.eu/xl-converter)

## Building from Source

> [!NOTE]
> The recommended way of using XL Converter is through the [official binary releases](https://codepoems.eu/xl-converter). The building process is time-consuming.

### Windows 10

Prerequisites:
- [Python 3.13](https://python.org/downloads/) (check `Add python.exe to PATH`)
- [git](https://git-scm.com/)
- [MSYS2](https://msys2.org/)
- Visual Studio 2022 (with Windows 10 or 11 SDK)
- Latest [vc_redist](https://aka.ms/vs/17/release/vc_redist.x64.exe)

Launch MSYS2 MINGW64:

```bash
pacman -Syu
pacman -S --needed git cmake mingw-w64-x86_64-gcc
```

Clone the repo:

```bash
git clone -b stable --depth 1 https://github.com/JacobDev1/xl-converter.git
cd xl-converter
```

> [!IMPORTANT]
> If you installed or upgraded any package, restart the MSYS2 environment. Otherwise, building will start failing for random reasons.

Run each target individually; each has additional requirements:
- `make libjpeg-turbo`
- `make libavif`
- `make imagemagick`
- `make libjxl`
- `make oxipng`
- `make exiftool`

Launch CMD, enter the project's directory, and setup a virtual environment:

```cmd
cd C:\msys64\home\user\xl-converter
python -m venv env_build
env_build\Scripts\activate
pip install -r requirements.txt
```

Run the application:

```cmd
python main.py
```

#### Building

Launch CMD, and setup PyInstaller:

```cmd
cd C:\msys64\home\user\xl-converter
env_build\Scripts\activate
%comspec% /k "C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvars64.bat"
git clone -b v6.11.1 --depth 1 https://github.com/pyinstaller/pyinstaller.git misc\pyinstaller
cd misc\pyinstaller\bootloader
python waf all
cd ..
pip install .
cd ..\..
env_build\Scripts\activate
```

The last line reloads the environment to avoid the `ModuleNotFoundError`.

Bundle:

```cmd
python build.py
```

### Linux (Ubuntu-based)

Prerequisites:
- Docker (set up to run without root)
- [pyenv](https://github.com/pyenv/pyenv) ([add to shell](https://github.com/pyenv/pyenv?tab=readme-ov-file#set-up-your-shell-environment-for-pyenv))

Install packages:

```bash
sudo apt update
sudo apt install git make curl fuse p7zip-full
```

Install [xcb QPA](https://doc.qt.io/qt-6/linux-requirements.html) dependencies:

```bash
sudo apt install '^libxcb.*-dev' libfontconfig1-dev libfreetype6-dev libx11-dev libx11-xcb-dev libxext-dev libxfixes-dev libglu1-mesa-dev libxrender-dev libxi-dev libxkbcommon-dev libxkbcommon-x11-dev
```

Install Python build dependencies:

```bash
sudo apt install wget build-essential libreadline-dev libncursesw5-dev libssl-dev libsqlite3-dev tk-dev libgdbm-dev libc6-dev libbz2-dev libffi-dev zlib1g-dev liblzma-dev
```

Compile and setup Python `3.13`:

```bash
pyenv install 3.13
pyenv global 3.13
```

Clone and set up the repo:

```bash
git clone -b stable --depth 1 https://github.com/JacobDev1/xl-converter.git
cd xl-converter
```

Compile dependencies:

```bash
make deps
```

Setup a virtual environment:

```bash
python -m venv env_build
source env_build/bin/activate
pip install -r requirements.txt
```

Run the program:

```bash
python main.py
```

#### Building

Setup PyInstaller:

```bash
source env_build/bin/activate
git clone -b v6.11.1 --depth 1 https://github.com/pyinstaller/pyinstaller.git misc/pyinstaller
cd misc/pyinstaller/bootloader
python waf all --gcc
cd ..
pip install .
cd ../..
source env_build/bin/activate
```

The last line reloads the environment to avoid the `ModuleNotFoundError` error.

Build:

```bash
python build.py
```

### macOS

> [!NOTE]
> The native macOS support is experimental. Use Wine instead.

Install:
- [Homebrew](https://brew.sh/)
- [Rust](https://www.rust-lang.org/)
- [Python 3.13 Universal2 build](https://www.python.org/downloads/macos/)

Open a new terminal and install the necessary packages:

```bash
brew install nasm cmake llvm coreutils giflib jpeg-turbo libpng ninja zlib wget brotli make gnu-sed  pkgconf libomp imath glib gettext webp openjpeg little-cms2 fontconfig freetype jpeg-xl libheif liblqr libtiff libtool
```

Make sure `clang` is pointing to the one provided by Homebrew.

Run each target individually; each has additional requirements:
- `make libjpeg-turbo`
- `make libavif`
- `make imagemagick`
- `make libjxl`
- `make oxipng`

Create and activate a virtual environment:

```bash
python -m venv env_build
source env_build/bin/activate
pip install -r requirements.txt
```

Run the application:

```bash
python main.py
```

Bundling support is limited. The exported bundle will not work on another machine!

Clone PyInstaller, recompile the bootloader, and install:

```bash
git clone -b v6.11.1 --depth 1 https://github.com/pyinstaller/pyinstaller.git misc/pyinstaller
cd misc/pyinstaller/bootloader
python waf all --clang
cd ..
pip install .
cd ../..
```

Bundle:

```bash
python build.py
```

## Info

> [!TIP]
> To manage multiple Python versions on Windows, you can use: the `py` launcher or pyenv-win.

## Testing

[Setup repo](#building-from-source).

Create a test environment.

```bash
python -m venv env_dev
source env_dev/bin/activate
pip install -r requirements.txt -r requirements_test.txt
```

### Unit Tests

```cmd
python test.py
```

You can control which tests to run. Run `python test.py --help` to learn more.

### Functional Tests

`test_convert.py` is a separate test suite focusing on validating program's output.

#### Linux

```bash
sudo apt install xvfb
make test-convert
```

#### Windows

```bash
python test_convert.py
```

## Contributing

Before contributing to issues or sending pull requests, please review [CONTRIBUTING.md](./.github/CONTRIBUTING.md).
