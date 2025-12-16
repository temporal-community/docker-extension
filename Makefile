.PHONY: build install uninstall dev

# Extension name
IMAGE_NAME := temporal-extension

build:
	docker build -t $(IMAGE_NAME):latest .

install: build
	docker extension install $(IMAGE_NAME):latest

uninstall:
	docker extension rm $(IMAGE_NAME):latest

update: build
	docker extension update $(IMAGE_NAME):latest

dev: uninstall install
	@echo "Extension installed in dev mode"

clean:
	docker rmi $(IMAGE_NAME):latest || true
