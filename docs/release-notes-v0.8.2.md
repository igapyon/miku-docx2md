# Release Notes: v0.8.2

## Overview

This release strengthens the CLI metadata surface and GitHub Release asset preparation for `miku-docx2md`.

## User-Facing Changes

- Added `--version` to the Node.js CLI.
  - The command prints `miku-docx2md <version>`.
  - It does not require a `.docx` input file.
- Expanded `--help` so humans, scripts, and AI agents can understand the CLI contract from the command output.
  - Usage
  - Contract
  - Options
  - Outputs
  - Examples
  - Exit codes
- Clarified that `--help` and `--version` are metadata commands that must be used without other arguments.
- Documented `--version` and `--help` usage in README and `docs/usage.md`.

## Release Workflow Changes

- Added a GitHub Release asset workflow.
  - Runs on published releases and manual dispatch.
  - Verifies release tag version against `package.json`.
  - Builds the single-file Web app.
  - Runs unit tests and CLI version smoke check.
  - Verifies generated Web artifacts are in sync after build.
  - Uploads versioned HTML and source archive release assets.

## Test and Maintenance Changes

- Added CLI tests for `--help`, `--version`, metadata-command argument validation, release workflow checks, and version smoke script alignment.
- Added Vitest configuration so standard test runs exclude `workplace/**` and only run tests owned by this repository.

## Verification

- `npm run build`
- `npm run test:unit`
- `npm run smoke:version`
- `git diff --exit-code -- index.html miku-docx2md.html src/js`

## Remaining Release Gate

Real-document quality validation remains to be completed before treating the project as fully release-ready.
