# Build UI
FROM node:18-alpine AS ui-builder
WORKDIR /app
COPY ui/package*.json ./
RUN npm ci
COPY ui/ ./
RUN npm run build

# Final extension image
FROM scratch

ARG VERSION=1.0.0

LABEL org.opencontainers.image.title="Temporal" \
    org.opencontainers.image.description="Run Temporal Server locally with persistent SQLite storage" \
    org.opencontainers.image.vendor="Temporal Technologies" \
    org.opencontainers.image.version="${VERSION}" \
    com.docker.desktop.extension.api.version=">= 0.3.0" \
    com.docker.desktop.extension.icon="https://raw.githubusercontent.com/temporalio/documentation/main/static/img/favicon.ico" \
    com.docker.extension.detailed-description="Run and manage a local Temporal development server from Docker Desktop. Includes one-click start/stop controls, workflow visibility, and persistent SQLite data. Source code: https://github.com/temporal-community/docker-extension" \
    com.docker.extension.publisher-url="https://temporal.io" \
    com.docker.extension.additional-urls="[{\"title\":\"Documentation\",\"url\":\"https://docs.temporal.io\"},{\"title\":\"Support\",\"url\":\"https://community.temporal.io\"},{\"title\":\"Source Code\",\"url\":\"https://github.com/temporal-community/docker-extension\"}]" \
    com.docker.extension.categories="utility-tools" \
    com.docker.extension.changelog="Version ${VERSION}: maintenance and compatibility updates." \
    com.docker.extension.screenshots="[{\"alt\":\"Temporal extension dashboard in Docker Desktop\",\"url\":\"https://raw.githubusercontent.com/temporal-community/docker-extension/main/extension-screenshot.png\"}]"

COPY --from=ui-builder /app/dist ./ui
COPY metadata.json .
COPY temporal-icon.svg .
