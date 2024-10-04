.DELETE_ON_ERROR:
all: install build

.PHONY: install
install:
	pnpm install
	pnpm migrate:prod

.PHONY: build
build:
	pnpm build

.PHONY: fixdeps
fixdeps:
	chmod +x scripts/install_chrome_deps.sh
	sudo ./scripts/install_chrome_deps.sh

.PHONY: image
image:
	sudo docker build -t convo:devbuild .

.PHONY: clean
clean:
	rm -rf build

.PHONY: clean.all
clean.all:
	rm -rf build node_modules