# Docker Marketplace Submission Tasks

## Status

All blocking tasks below are completed in this branch.

## Tasks

- [x] Replace iframe/proxy embedding pattern with extension-native UI controls and browser handoff for Temporal Web.
- [x] Remove legacy iframe/proxy implementation artifacts from the extension package.
- [x] Ensure extension UI is built with React + MUI and Docker extension SDK client.
- [x] Ensure required extension image labels are present and Marketplace metadata is populated.
- [x] Set Marketplace category to a documented value.
- [x] Ensure multi-arch release images are produced (`linux/amd64`, `linux/arm64`).
- [x] Gate publish pipeline on semantic version tags (`vX.Y.Z`).
- [x] Add deterministic local validation path (`make validate`) for metadata + install/uninstall checks.
- [x] Add release validation path (`make validate-release`) for published Docker Hub semver images.
- [x] Update README to reflect current UX and semver release process.

## Remaining External Step

- [ ] Submit to Docker Marketplace using Docker's self-publish flow once a semver release tag has been pushed.
