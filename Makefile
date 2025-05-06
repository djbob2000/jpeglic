# Config

PYTHON 				= python
ENV_BUILD 			= ./env_build
ENV_DEV 			= ./env_dev
REQUIREMENTS_BUILD 	= requirements.txt
REQUIREMENTS_TEST 	= requirements_test.txt

# Build / Misc.

.PHONY: build-linux
build-linux:
	rm -rf ./dist
	mkdir -p ./dist
	docker build -f ./misc/linux_build.Dockerfile --progress=plain --iidfile tmp.txt . && \
	image_id=$$(cat tmp.txt) && \
	container_id=$$(docker create $${image_id}) && \
	docker cp $${container_id}:/export/. ./dist && \
	docker rm $${container_id} && \
	docker rmi -f $${image_id}
	rm tmp.txt

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