.PHONY: build install uninstall update dev clean validate validate-local validate-release

# Extension image
IMAGE_NAME := temporalio/temporal_docker_extension
LOCAL_VALIDATE_IMAGE := temporal-temporal-extension-unpublished
VERSION ?= 1.0.0

build:
	docker build --build-arg VERSION=$(VERSION) \
		-t $(IMAGE_NAME):$(VERSION) -t $(IMAGE_NAME):latest \
		-t $(LOCAL_VALIDATE_IMAGE):$(VERSION) -t $(LOCAL_VALIDATE_IMAGE):latest .

validate-local: build
	docker extension validate --errors-only --sdk-compatibility metadata.json
	- docker extension rm $(LOCAL_VALIDATE_IMAGE):latest >/dev/null 2>&1 || true
	docker extension install --force $(LOCAL_VALIDATE_IMAGE):latest
	docker extension rm $(LOCAL_VALIDATE_IMAGE):latest
	@echo "Local extension validation passed"

validate-release:
	docker extension validate --auto-resolve-tag --errors-only --sdk-compatibility --validate-install-uninstall $(IMAGE_NAME)

validate: validate-local

install: build
	docker extension install --force $(IMAGE_NAME):latest

uninstall:
	docker extension rm $(IMAGE_NAME):latest

update: build
	docker extension update $(IMAGE_NAME):latest

dev: uninstall install
	@echo "Extension installed in dev mode"

clean:
	docker rmi $(IMAGE_NAME):latest || true
