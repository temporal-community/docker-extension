.PHONY: build install uninstall dev validate

# Extension name
IMAGE_NAME := temporalio/temporal_docker_extension
VERSION ?= 1.0.0

build:
	docker build --build-arg VERSION=$(VERSION) -t $(IMAGE_NAME):$(VERSION) -t $(IMAGE_NAME):latest .

validate: build
	docker extension validate --auto-resolve-tag --errors-only --sdk-compatibility --validate-install-uninstall $(IMAGE_NAME)

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
