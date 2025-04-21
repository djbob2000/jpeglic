# Using oldest maintained version for best GLIBC compatibility.
# `debian:11-slim` will also work, but QFileDialog does not support platform-native dialog out of the box there. `test_convert.py` also breaks.
FROM ubuntu:22.04

ARG PYINSTALLER_TAG=v6.11.1

ENV DEBIAN_FRONTEND noninteractive
ENV PYENV_ROOT="$HOME/.pyenv"
ENV PATH="$PYENV_ROOT/bin:$PYENV_ROOT/shims:$PATH"

RUN apt update && apt install -y \
    git \
    make \
    curl \
    squashfs-tools \
    libfuse2 \
    file \
    p7zip-full \
    xvfb \
    '^libxcb.*-dev' \
    libfontconfig1-dev \
    libfreetype6-dev \
    libx11-dev \
    libx11-xcb-dev \
    libxext-dev \
    libxfixes-dev \
    libglu1-mesa-dev \
    libxrender-dev \
    libxi-dev \
    libxkbcommon-dev \
    libxkbcommon-x11-dev \
    wget \
    build-essential \
    libreadline-dev \
    libncursesw5-dev \
    libssl-dev \
    libsqlite3-dev \
    tk-dev \
    libgdbm-dev \
    libc6-dev \
    libbz2-dev \
    libffi-dev \
    zlib1g-dev \
    liblzma-dev \
    libdbus-1-3 \
    libpulse-dev \
    libegl1 \
    libpipewire-0.3-0 \
    exiftool \
    && rm -rf /var/lib/apt/lists/* && \
    echo "user_allow_other" >> /etc/fuse.conf
    
# Install Python
RUN curl -fsSL https://pyenv.run | bash
    
RUN pyenv install 3.13 && \
    pyenv global 3.13

# Copy project files
WORKDIR /build
COPY . /build

# Run unit tests
RUN python -m venv /build/env_dev && \
    . /build/env_dev/bin/activate && \
    pip install -r /build/requirements.txt -r /build/requirements_test.txt && \
    xvfb-run -a python test.py && \
    xvfb-run -a python test_convert.py
    
# Setup virtual environment
RUN python -m venv /build/env_build && \
    . /build/env_build/bin/activate && \
    pip install -r /build/requirements.txt

# Setup PyInstaller
RUN . /build/env_build/bin/activate && \
    git clone -b ${PYINSTALLER_TAG} --depth 1 https://github.com/pyinstaller/pyinstaller.git /build/misc/pyinstaller && \
    cd /build/misc/pyinstaller/bootloader && \
    python waf all --gcc && \
    cd .. && \
    pip install .

# Build
RUN mkdir -p /export
RUN . /build/env_build/bin/activate && \
    xvfb-run -a python build.py -b sh && \
    cp /build/dist/*.7z /export
RUN . /build/env_build/bin/activate && \
    xvfb-run -a python build.py -b appimage-skip-packing && \
    ./misc/appimagetool --appimage-extract && \
    BUILD_NAME=$(cat /build/dist/build_name.txt) && \
    ./squashfs-root/AppRun ./dist/AppDir ./dist/${BUILD_NAME} && \
    cp /build/dist/*.AppImage /export

CMD ["/bin/bash"]