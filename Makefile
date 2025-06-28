# Config

PYTHON 				= python
ENV_BUILD 			= ./env_build
ENV_DEV 			= ./env_dev
REQUIREMENTS_BUILD 	= requirements.txt
REQUIREMENTS_TEST 	= requirements_test.txt

# Building on Linux

define docker_build
	mkdir -p $(3)
	docker build -f $(1) --progress=plain --iidfile tmp.txt . && \
	image_id=$$(cat tmp.txt) && \
	container_id=$$(docker create $${image_id}) && \
	docker cp $${container_id}:$(2) $(3) && \
	docker rm $${container_id} && \
	docker rmi -f $${image_id}
	rm tmp.txt
endef

.PHONY: build-libjxl
build-libjxl:
	cd ./bin/linux && rm -f cjxl djxl jxlinfo cjpegli
	$(call docker_build,./misc/build_scripts/linux/Dockerfile.libjxl,/src/bin/.,./bin/linux)

.PHONY: build-libavif
build-libavif:
	cd ./bin/linux && rm -f avifenc avifdec 
	$(call docker_build,./misc/build_scripts/linux/Dockerfile.libavif,/src/bin/.,./bin/linux)

.PHONY: build-imagemagick
build-imagemagick:
	rm -rf ./bin/linux/imagemagick
	$(call docker_build,./misc/build_scripts/linux/Dockerfile.imagemagick,/src/bin/.,./bin/linux/imagemagick)

.PHONY: build-libjpeg-turbo
build-libjpeg-turbo:
	rm -f ./bin/linux/jpegtran
	$(call docker_build,./misc/build_scripts/linux/Dockerfile.libjpeg-turbo,/src/bin/.,./bin/linux)

.PHONY: build-oxipng
build-oxipng:
	rm -f ./bin/linux/oxipng
	$(call docker_build,./misc/build_scripts/linux/Dockerfile.oxipng,/src/bin/.,./bin/linux)

.PHONY: build-oxipng-win-docker
build-oxipng-win-docker:
	rm -rf ./bin/win/oxipng
	$(call docker_build,./misc/build_scripts/windows/Dockerfile.oxipng,/src/bin/.,./bin/win/oxipng)

.PHONY: deps
deps: build-libjxl build-libavif build-imagemagick build-libjpeg-turbo build-oxipng

.PHONY: build
build:
	rm -rf ./dist
	$(call docker_build,./misc/build_scripts/linux/Dockerfile.build,/export/.,./dist)

.PHONY: build-all
build-all: deps build

# Building on Windows

.PHONY: download-exiftool-win
download-exiftool-win:
	rm -rf ./bin/win/exiftool
	bash ./misc/build_scripts/windows/exiftool.sh

.PHONY: build-libavif-win
build-libavif-win:
	rm -rf ./bin/win/libavif
	bash ./misc/build_scripts/windows/libavif.sh

.PHONY: build-libjpeg-turbo-win
build-libjpeg-turbo-win:
	rm -rf ./bin/win/jpegtran
	bash ./misc/build_scripts/windows/libjpeg-turbo.sh

.PHONY: build-imagemagick-win
build-imagemagick-win:
	rm -rf ./bin/win/imagemagick
	bash ./misc/build_scripts/windows/imagemagick.sh

.PHONY: build-libjxl-win
build-libjxl-win:
	rm -rf ./bin/win/libjxl
	bash ./misc/build_scripts/windows/libjxl.sh

.PHONY: build-oxipng-win
build-oxipng-win:
	rm -rf ./bin/win/oxipng
	bash ./misc/build_scripts/windows/oxipng.sh

.PHONY: deps-win
deps-win: build-libjpeg-turbo-win build-libjxl-win build-libavif-win build-imagemagick-win build-oxipng-win download-exiftool-win

.PHONY: build-win
build-win:
	bash ./misc/build_scripts/windows/build.sh

# Building on macOS

# .PHONY: download-exiftool-macos
# download-exiftool-macos:
# 	rm -rf ./bin/macos/exiftool
# 	bash ./misc/build_scripts/macos/exiftool.sh

.PHONY: build-libavif-macos
build-libavif-macos:
	rm -rf ./bin/macos/libavif
	bash ./misc/build_scripts/macos/libavif.sh

.PHONY: build-libjpeg-turbo-macos
build-libjpeg-turbo-macos:
	rm -rf ./bin/macos/jpegtran
	bash ./misc/build_scripts/macos/libjpeg-turbo.sh

.PHONY: build-imagemagick-macos
build-imagemagick-macos:
	rm -rf ./bin/macos/imagemagick
	bash ./misc/build_scripts/macos/imagemagick.sh

.PHONY: build-libjxl-macos
build-libjxl-macos:
	cd ./bin/macos && rm -f cjxl djxl jxlinfo cjpegli
	bash ./misc/build_scripts/macos/libjxl.sh

.PHONY: build-oxipng-macos
build-oxipng-macos:
	rm -rf ./bin/macos/oxipng
	bash ./misc/build_scripts/macos/oxipng.sh

# .PHONY: deps-macos
# deps-macos: build-libjpeg-turbo-macos build-libjxl-macos build-libavif-macos build-imagemagick-macos build-oxipng-macos download-exiftool-macos

# .PHONY: build-macos
# build-macos:
# 	bash ./misc/build_scripts/macos/build.sh

# Misc.

.PHONY: clean
clean:
	rm -rf _pyinstaller __pycache__ htmlcov .coverage .pytest_cache

.PHONY: src
src:
	rm -rf ./dist
	mkdir -p dist/src
	
	cp .gitignore .rsync-exclude
	sed -i '/^\/bin\//d; /^\/misc\//d' .rsync-exclude
	rsync -a --exclude-from=.rsync-exclude --exclude=.git --exclude=screenshots ./ dist/src/
	rm .rsync-exclude

	cd dist && 7z a -t7z -mx1 src_`date +%Y%m%d_%H%M%S`.7z src/
	rm -rf ./dist/src

.PHONY: venv-build
venv-build:
	@if [ -d $(ENV_BUILD) ] ; then \
		echo "venv-build already exists"; \
	else \
		echo "Creating venv-build..."; \
		$(PYTHON) -m venv $(ENV_BUILD); \
		$(ENV_BUILD)/bin/python3 -m pip install --upgrade pip; \
		$(ENV_BUILD)/bin/python3 -m pip install -r $(REQUIREMENTS_BUILD); \
		echo "venv-build has been created at $(ENV_BUILD)"; \
	fi

.PHONY: venv-dev
venv-dev:
	@if [ -d $(ENV_DEV) ] ; then \
		echo "venv-dev already exists"; \
	else \
		echo "Creating venv-dev..."; \
		$(PYTHON) -m venv $(ENV_DEV); \
		$(ENV_DEV)/bin/python3 -m pip install --upgrade pip; \
		$(ENV_DEV)/bin/python3 -m pip install -r $(REQUIREMENTS_BUILD); \
		$(ENV_DEV)/bin/python3 -m pip install -r $(REQUIREMENTS_TEST); \
		echo "venv-build has been created at $(ENV_DEV)"; \
	fi

# Testing

.PHONY: test
test:
	$(PYTHON) test.py

.PHONY: test-slowest
test-slowest:
	export PYTHONPATH=$$PYTHONPATH:. && pytest --durations=10 --durations-min=0.02 tests/

.PHONY: test-no-cache
test-no-cache:
	export PYTHONPATH=$$PYTHONPATH:. && pytest --cache-clear tests/

.PHONY: test-convert
test-convert:
	@if [ -n "$(name)" ]; then \
		QT_QPA_PLATFORM=offscreen xvfb-run -a $(PYTHON) -m unittest test_convert.TestMainWindow.$(name); \
	else \
		QT_QPA_PLATFORM=offscreen xvfb-run -a $(PYTHON) test_convert.py; \
	fi

.PHONY: coverage
coverage:
	export PYTHONPATH=$$PYTHONPATH:. && pytest --cov=core --cov=ui --cov=main --cov=data --cov=build --cov-report term-missing tests/
	coverage html

.PHONY: validate-appstream
validate-appstream:
	flatpak run --command=flatpak-builder-lint org.flatpak.Builder appstream ./misc/eu.codepoems.xl-converter.metainfo.xml
