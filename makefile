.PHONY: run clean build build-appimage build-7z src-full src-min test

clean:
	rm -rf dist

clean-all: clean
	rm -rf build __pycache__

run:
	python3 main.py

build:
	python3 build.py

build-appimage:
	python3 build.py -a

build-7z:
	python3 build.py -p

src: clean
	mkdir -p dist/src
	
	cp .gitignore .rsync-exclude
	sed -i '/^\/bin\//d; /^\/misc\//d' .rsync-exclude
	rsync -a --exclude-from=.rsync-exclude --exclude=.git --exclude=screenshots ./ dist/src/
	rm .rsync-exclude

	cd dist && 7z a src_`date +%Y%m%d_%H%M%S`.zip src/

test:
ifdef n
	python3 -m unittest tests.TestMainWindow.$(n)
else
	python3 tests.py
endif