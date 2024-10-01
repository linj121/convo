.DELETE_ON_ERROR:
all: install build

.PHONY: install
install:
	pnpm install
	pnpm migrate:prod

.PHONY: build
build:
	pnpm build

.PHONY: docker
docker:
	sudo docker build --progress=plain -t convo:testbuild .

.PHONY: fixdeps
fixdeps:
	chmod +x scripts/install_chrome_deps.sh
	sudo ./scripts/install_chrome_deps.sh

.PHONY: clean
clean:
	rm -rf build

.PHONY: clean.all
clean.all:
	rm -rf build node_modules