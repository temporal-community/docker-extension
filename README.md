# Temporal Docker Desktop Extension

![Temporal Docker Extension](extension-screenshot.png)

Docker Desktop extension for running Temporal Server locally with persistent SQLite storage.

## What This Provides

- One-click Temporal Server start/stop
- Workflow list and status visibility inside Docker Desktop
- One-click launch of Temporal Web UI in your browser (`localhost:8233`)
- SQLite persistence via Docker volume

## Prerequisites

- Docker Desktop with Extensions enabled

## Local Development

```bash
make install
```

To update after local changes:

```bash
make update
```

To remove:

```bash
make uninstall
```

## Usage

1. Open Docker Desktop
2. Click `Temporal` in the left sidebar
3. Click `Start Server`
4. Click `Open Temporal UI` to open Temporal Web at `http://localhost:8233`

## Persistence

Workflow data is persisted in Docker volume `temporal-dev-data`. It survives:

- Container restarts
- Extension updates
- Docker Desktop restarts

To reset all data:

```bash
docker volume rm temporal-dev-data
```

## Validation

Run local validation before release:

```bash
make validate
```

This validates metadata and performs an install/uninstall cycle for the locally built extension image.

## Release Process (Marketplace-ready)

1. Create and push a semantic version tag:

```bash
git tag v1.0.0
git push origin v1.0.0
```

2. The publish workflow builds and pushes a multi-arch image (`linux/amd64`, `linux/arm64`) with semver tags.
3. The release workflow runs Docker extension validation against the published image.

## Technical Details

This extension runs Temporal dev server with:

- SQLite backend (`--db-filename /data/temporal.db`)
- Listen on all interfaces (`--ip 0.0.0.0`, `--ui-ip 0.0.0.0`)
- Health visibility from the extension dashboard
