# Browser Smoke Checklist

This checklist records the browser-side smoke path for committed DOCX fixtures and local validation documents.

Use it after `npm run build` so `miku-docx2md.html` and `src/js/` reflect the current TypeScript sources.

## Scope

Check the browser adapter and downloadable artifacts. Core parser behavior is covered by unit tests and CLI validation.

Recommended documents:

- `tests/fixtures/docx/word-headings-basic.docx`
- `tests/fixtures/docx/word-links-basic.docx`
- `tests/fixtures/docx/word-table-merged-cell-basic.docx`
- `tests/fixtures/docx/word-inline-image-basic.docx`
- `tests/fixtures/docx/word-image-alt-text-basic.docx`
- local `workplace/validation-docx/05-word-openable-image.docx` when present

## Manual Steps

1. Open `index.html` in a local browser.
2. Open `miku-docx2md.html` from the landing page.
3. Select one `.docx` file.
4. Confirm conversion starts automatically after file selection.
5. Confirm Markdown preview is populated.
6. Confirm summary preview is populated.
7. Toggle unsupported debug comments and confirm Markdown preview refreshes.
8. For image fixtures, toggle `Use image asset links` and confirm Markdown switches between `![](...)` links and `[Image: ...]` placeholders.
9. Download Markdown and summary.
10. For image fixtures, download the asset ZIP.
11. Confirm the asset ZIP contains `manifest.json` and the referenced `word/media/...` image.

## Expected Results

- Heading fixtures show Markdown headings.
- Link fixtures preserve external links and resolved internal links.
- Table fixtures render rectangular Markdown tables with merge placeholders when needed.
- Image fixtures show readable image alt text and expose image assets.
- Debug comments are concise enough to identify unsupported or drawing-like content.
- Summary counts are not obviously inconsistent with the preview.

## Current Automation Note

This repository currently has Node/jsdom-oriented tests but no browser automation dependency such as Playwright or Puppeteer. Browser conversion is therefore tracked as a manual smoke path unless a future change adds a dedicated browser test runner.
