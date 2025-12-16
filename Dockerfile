FROM scratch

LABEL org.opencontainers.image.title="Temporal" \
    org.opencontainers.image.description="Run Temporal Server locally with persistent SQLite storage" \
    org.opencontainers.image.vendor="shy" \
    com.docker.desktop.extension.api.version=">= 0.3.0" \
    com.docker.desktop.extension.icon="https://raw.githubusercontent.com/temporalio/documentation/main/static/img/favicon.ico" \
    com.docker.extension.detailed-description="Docker Desktop extension for running Temporal Server locally with SQLite persistence" \
    com.docker.extension.publisher-url="" \
    com.docker.extension.additional-urls="" \
    com.docker.extension.categories="" \
    com.docker.extension.changelog=""

COPY ui ./ui
COPY metadata.json .
COPY temporal-icon.svg .
