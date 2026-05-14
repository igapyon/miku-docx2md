# Node/Web Separation Procedure

This document records the local procedure used to separate the historical
combined `miku-docx2md` repository into:

- `miku-docx2md`: TypeScript / Node.js product core, CLI, Node runtime bundle,
  tests, and upstream contract
- `miku-docx2md-web`: browser UI, Single-file Web App generation, `lht-cmn`,
  browser adapters, browser tests, and Web release artifacts

The dependency direction is:

```text
miku-docx2md-web -> miku-docx2md
```

Do not make the main application depend on the Web repository.

## Checkpoint 1: Scope and Ownership

Confirm the two repositories before deleting files.

- Main application repository: `miku-docx2md`
- Web App repository: `miku-docx2md-web`
- Web App local reference checkout: sibling `../miku-docx2md-web` when present
- Product semantics stay in `miku-docx2md`
- Browser UI and Single-file HTML artifacts move to `miku-docx2md-web`
- CLI runtime bundle remains a main application release artifact
- Web HTML artifact is a Web repository release artifact

Use the Web repository as read-only context while cleaning the main application
repository.

## Checkpoint 2: Web Repository Ready

Before cleaning the main repository, make sure the Web repository already has
the moved Web surface.

Expected Web-side ownership:

- `index-src.html`
- `index.html`
- `miku-docx2md-src.html`
- `miku-docx2md.html`
- `src/ts/main.ts`
- `src/ts/browser-zip.ts`
- `src/ts/browser-assets-export.ts`
- `src/css/`
- `lht-cmn/`
- browser UI tests
- browser ZIP / asset export tests
- Single-file HTML build helper

The Web README should record the upstream main application repository and the
local development link, such as `file:../miku-docx2md` or an equivalent
documented upstream path.

## Checkpoint 3: Main Repository Cleanup

In `miku-docx2md`, remove Web-only files after the Web repository is ready.

Remove:

- Web source HTML and generated HTML
- `lht-cmn/`
- browser UI entrypoint and browser adapters
- browser-only generated JavaScript
- browser-only CSS
- browser UI / browser ZIP tests
- Single-file HTML build helper
- browser smoke checklist owned by the Web repository

Keep:

- `src/ts/` product core modules
- Node CLI script
- Node runtime loader
- CLI bundle builder
- core / CLI tests
- DOCX fixtures
- repository docs for CLI, quality checks, implementation behavior, and
  upstream contract

## Build Script Adjustment

After removing Web HTML generation, `npm run build` should only regenerate the
runtime JavaScript required by the Node runtime.

The main repository should not build `index.html` or `miku-docx2md.html`.

Recommended main-side build roles:

- `npm run build`: transpile core TypeScript modules for Node runtime loading
- `npm run build:bundle`: generate CLI runtime bundle under `bundle/`
- `npm run build:all`: run both commands

Release workflow generated-file checks should match the remaining generated
files. After Web separation, the main repository should not check Web HTML
artifacts.

## Documentation Updates

Update main repository documents so they no longer present browser UI behavior
as main-repository-owned behavior.

Update at least:

- `README.md`
- `docs/usage.md`
- `docs/quality-check.md`
- `docs/docx2md-impl-spec.md`
- `docs/docx2md-spec.md`
- validation or worklog documents that refer to browser smoke checks
- `TODO.md` when it tracks migration work

The docs should say that browser UI and Single-file Web App artifacts are owned
by `miku-docx2md-web`.

## Generated JavaScript Follow-up

After Web separation, `src/js/` is no longer Web distribution source. Move it
out of source control by making the runtime loader and bundle builder read from
a generated directory instead.

Recommended follow-up shape:

```text
src/ts/        source of truth
dist/js/       generated runtime JavaScript, ignored by Git
bundle/        generated CLI bundle artifacts, ignored by Git
```

Required steps for that follow-up:

1. Change `scripts/lib/docx2md-module-order.mjs` from `src/js/...` paths to
   `dist/js/...` paths.
2. Keep a derived TypeScript order that maps generated JS paths back to
   `src/ts/...`.
3. Change `scripts/build-miku-docx2md.mjs` so it writes transpiled output to
   `dist/js/`.
4. Change `scripts/lib/docx2md-node-runtime.mjs` and
   `scripts/build-cli-bundle.mjs` so they read generated runtime modules from
   `dist/js/`.
5. Add `dist/` to `.gitignore` if it is not already ignored.
6. Remove tracked generated `src/js/*.js` files from Git.
7. Update README and quality-check docs from `src/js/` to `dist/js/`.
8. Update release workflow generated-file checks. Because `dist/` is ignored
   and regenerated in CI, use a generated-file existence check instead of a Git
   diff check for generated JS.

This follow-up is now the intended main-repository shape. Confirm the CLI,
tests, and bundle builder all use the generated runtime directory consistently.

## Verification

Run main-side verification after cleanup:

```bash
npm install
npm run build
npm run test:unit
npm run build:bundle
npm run smoke:bundle
npm run smoke:version
npx tsc --noEmit
git diff --check
git status --short
```

If `node_modules/` was removed locally, `npm run build` can fail because the
build script imports `typescript`. Run `npm install` before build verification.
