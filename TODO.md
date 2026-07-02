# TODO

## Phase 1: Project Skeleton

- [x] Create `README.md`
- [x] Create `docs/docx2md-spec.md`
- [x] Create `docs/docx2md-impl-spec.md`
- [x] Add project package metadata and test scripts
- [x] Add `src/ts/` and `src/js/` skeleton
- [x] Add minimal node runtime loader

## Phase 2: Core Parsing Foundation

- [x] Implement ZIP expansion in-house
- [x] Implement XML utility helpers
- [x] Implement relationship path resolution
- [x] Implement minimal `.docx` document parser
- [x] Implement minimal Markdown renderer

## Phase 3: First-Cut Features

- [x] Paragraph extraction
- [x] Heading detection
- [x] Inline formatting
- [x] External hyperlinks
- [x] Internal hyperlinks
- [x] Lists with nesting
- [x] Tables
- [x] Merge placeholders `←M←` / `↑M↑`

## Phase 4: Diagnostics

- [x] Summary counts
- [x] Unsupported element diagnostics
- [x] Debug option for unsupported HTML comments

## Phase 5: Tests

- [x] Plain paragraph fixture
- [x] Heading fixture
- [x] Inline formatting fixture
- [x] External hyperlink fixture
- [x] Internal hyperlink fixture
- [x] Nested list fixture
- [x] Table fixture
- [x] Unsupported element debug fixture

## Phase 6: Post First-Cut Refinement

- [x] Normalize internal bookmark anchors and internal hyperlink fragments
- [x] Preserve list-like paragraphs inside table cells as simplified inline list text
- [x] Classify unsupported elements in more detail than raw local-name passthrough where useful
- [x] Preserve heading-like paragraphs inside table cells as simplified heading text
- [x] Expand implementation docs for style inheritance depth and direct-format precedence

## Phase 7: Next Expansion Candidates

- [x] Emit debug unsupported-comment traces for unsupported elements nested inside supported blocks
- [x] Allow limited plain-text extraction for `txbxContent` while keeping textbox layout unsupported
- [x] Emit placeholder-like debug traces for unsupported image references with relationship targets when resolvable
- [x] Add focused tests for nested unsupported traces in CLI output as needed

## Phase 8: Richer Image Diagnostics

- [x] Include image alt text in debug traces when drawing metadata exposes `descr` or `title`
- [x] Include image dimensions from drawing metadata in debug traces when `wp:extent` is available
- [x] Emit a minimal non-debug placeholder for images when meaningful alt text is available

## Phase 9: Image Observability

- [x] Count image references in conversion summary output
- [x] Distinguish resolved embedded images from generic drawing-like unsupported objects in summary output

## Phase 10: Image Asset Export

- [x] Expose resolved embedded image package entries as parse-result assets in Node-oriented flows
- [x] Count extracted image assets separately from image references in summary output
- [x] Add CLI support for exporting resolved embedded image assets into a sidecar directory
- [x] Emit relative `![](...)` image links in Markdown when sidecar asset export is enabled explicitly

## Phase 11: Image Asset Metadata

- [x] Prefer `[Content_Types].xml` declarations over extension inference when reporting exported image asset media types
- [x] Expose downloadable image asset export in the browser UI as a ZIP archive

## Phase 12: Asset Export Packaging

- [x] Include `manifest.json` in CLI and browser asset exports
- [x] Include source trace strings and owning block indexes in asset manifests
- [x] Include finer manifest document positions with block kind and trace index

## Phase 13: Real Document Quality Pass

- [x] Collect a small local validation set of real `.docx` documents
- [x] Run browser conversion against the validation set
- [x] Run CLI conversion against the validation set
- [x] Compare Markdown readability for headings, lists, links, tables, and image placeholders
  - [x] Word-round-tripped local validation docs 01/02 checked for headings, lists, links, and tables
  - [x] Word-authored `word-headings-basic.docx` checked for Heading 1-5 and paragraphs
  - [x] Word-authored focused fixtures committed under `tests/fixtures/docx/word-*.docx`
  - [x] Image placeholder readability checked with `word-inline-image-basic.docx` and `word-image-alt-text-basic.docx`
- [x] Review generated summaries for obviously wrong counts
- [x] Review debug output for unsupported trace usefulness
- [x] Verify image asset export and `manifest.json` on documents with embedded images
  - [x] Replace invalid generated image validation candidates; `03-image-and-unsupported.docx` and `04-parser-image-asset.docx` were not Word-openable
  - [x] Fixed Word-authored inline image extraction from `word-inline-image-basic.docx`
- [x] Record recurring incompatibilities as focused fixtures or known limitations

## Phase 13.5: Additional Real Document Test Patterns

- [x] Add a Word-authored fixture with bullet lists created through Word UI
  - Word UI operation: create a new document, type three short lines, select them, then use Home > Bullets to make a normal bullet list.
  - Fixture: `tests/fixtures/docx/word-bullet-list-basic.docx`
- [x] Add a Word-authored fixture with numbered lists created through Word UI
  - Word UI operation: create a new document, type three short lines, select them, then use Home > Numbering to make a normal numbered list.
  - Fixture: `tests/fixtures/docx/word-numbered-list-basic.docx`
- [x] Add a Word-authored fixture with nested lists created through Word UI
  - Word UI operation: create a bullet or numbered list, place the cursor on the second item, then use Home > Increase Indent or press Tab to create a nested child item.
  - Fixture: `tests/fixtures/docx/word-nested-list-basic.docx`
- [x] Add a Word-authored fixture with external hyperlink and internal bookmark hyperlink
  - Word UI operation: create one external link with Insert > Link to `https://example.com`, then create a bookmark with Insert > Bookmark and link another text run to Place in This Document / the bookmark.
  - Fixture: `tests/fixtures/docx/word-links-basic.docx`
- [x] Add a Word-authored fixture with a table created through Word UI, including a merged cell
  - Word UI operation: use Insert > Table to create a small 3x3 table, fill every cell with short text, select two adjacent cells, then use Table Layout > Merge Cells.
  - Fixture: `tests/fixtures/docx/word-table-merged-cell-basic.docx`
- [x] Add a Word-authored fixture with bold / italic / underline / strike combinations across multiple runs
  - Word UI operation: type one paragraph with separate words for bold, italic, underline, strikethrough, and a combined-format word, then apply formatting from Home > Font buttons.
  - Fixture: `tests/fixtures/docx/word-inline-formatting-basic.docx`
- [x] Add a Word-authored fixture with Heading 1 through Heading 5 styles created through Word UI
  - Word UI operation: type short heading lines, then apply Home > Styles > Heading 1 through Heading 5.
  - Fixture: `tests/fixtures/docx/word-headings-basic.docx`
- [x] Extend the Word-authored heading fixture to cover Heading 6
  - Word UI operation: add one `Heading 6` line, then apply Home > Styles > Heading 6.
  - Expected Markdown output: `###### Heading 6`.
  - Fixture: `tests/fixtures/docx/word-headings-basic.docx`
- [x] Support custom paragraph heading styles that expose `w:outlineLvl`
  - Design rule: treat outline-level paragraph styles as headings; do not infer headings only from visual formatting.
  - Word UI operation for fixture: create or modify a custom paragraph style with an outline level, then apply it to a short line.
  - Regression coverage: focused DOCX test creates a custom paragraph style with `w:outlineLvl`.
- [x] Add a Word-authored fixture with an embedded inline image that is recognized as an exported asset
  - Word UI operation: use Insert > Pictures to insert a small local PNG, then set Layout Options to In Line with Text if Word does not choose inline placement automatically.
  - Fixture: `tests/fixtures/docx/word-inline-image-basic.docx`
  - Current parser result: `images: 1`, `imageAssets: 1`.
- [x] Add a Word-authored fixture with image alt text / description and verify Markdown alt text
  - Word UI operation: insert a small local PNG, open Picture Format > Alt Text, then set a short description such as `Sample alt text for fixture`.
  - Fixture: `tests/fixtures/docx/word-image-alt-text-basic.docx`
  - Current parser result: `images: 1`, `imageAssets: 1`; Markdown alt text is emitted as `Sample alt text for fixture`.
- [x] Add regression tests for the prepared Word-authored fixtures
  - Cover list counts, link counts, merged-cell placeholder output, and inline formatting output first.
  - Word inline image extraction and alt text are covered by regression tests for `word-inline-image-basic.docx` and `word-image-alt-text-basic.docx`.
- [x] Add a Word-authored table fixture with vertical merged cells
  - Word UI operation: create a small table, select two cells in the same column, then use Table Layout > Merge Cells.
  - Expected Markdown output: use `↑M↑` for the vertically merged continuation cell.
  - Regression coverage: focused DOCX test covers `w:vMerge` restart/continue.
- [x] Add a Word-authored table fixture with line breaks inside a table cell
  - Word UI operation: create a small table, type `line1`, insert a line break inside the same cell, then type `line2`.
  - Expected Markdown output: keep the cell readable with `<br>`.
  - Regression coverage: focused DOCX test covers ordered `w:t`, `w:br`, `w:t` inside one table cell run.
- [x] Add a focused fixture for Word proofing markers such as `w:proofErr` between formatted runs
- [x] Add browser-side smoke notes or manual checklist coverage for the committed fixtures

## Phase 13.6: Post-Validation Refactoring

- [x] After the real-document test pattern additions are complete, refactor the affected parsing modules
- [x] Keep parser behavior covered by committed fixtures before refactoring
- [x] Revisit drawing/image extraction boundaries after fixing or characterizing `word-inline-image-basic.docx`
- [x] Revisit inline formatting run coalescing after adding `w:proofErr` coverage
- [x] Re-run `npm run build`, `npm run test:unit`, `npm run smoke:version`, and generated artifact sync check after refactoring

## Phase 14: Release Readiness

- [x] Re-read README from a first-time user perspective
- [x] Re-read `docs/usage.md` for CLI and browser workflow accuracy
- [x] Confirm generated `index.html` and `miku-docx2md.html` are in sync with source files
- [x] Run `npm run build`
- [x] Run `npm run test:unit`
- [x] Prepare release notes from user-visible changes

## Phase 15: Refactoring

- [x] Review `miku-xlsx2md` module boundaries before cutting files
- [x] Split DOCX package loading and relationship/content-type resolution out of `core.ts` where useful
- [x] Split document XML block parsing, inline run parsing, table parsing, and drawing/image extraction out of `document-parser.ts`
- [x] Extract bookmark anchor normalization and duplicate-claiming helpers into a focused module
- [x] Extract drawing/image unsupported trace description into a focused module
- [x] Extract table grid-span and vertical-merge row construction into a focused module
- [x] Extract Markdown rendering/escaping helpers into focused modules instead of keeping rendering logic inside parser orchestration
- [x] Extract asset manifest construction and browser ZIP packaging into focused modules
- [x] Keep CLI and browser behavior unchanged while refactoring by adding or preserving focused regression tests
- [x] Update `scripts/lib/docx2md-module-order.mjs` and generated `src/js/` order whenever TypeScript modules are split
- [x] Re-run `npm run build` and `npm run test:unit` after each refactoring slice

## Phase 16: Refactoring Resume Notes

- [x] Next safe slice: extract inline run parsing and hyperlink rendering from `document-parser.ts` into `document-inline-parser.ts`
- [x] Keep textbox text extraction close to inline parsing at first because it calls the same run/text/style logic
- [x] Keep `renderStructuredParagraphText` in `document-parser.ts` until inline/textbox extraction is stable
- [x] After inline/textbox extraction, consider splitting top-level block parsing from `parseDocumentXml`
- [x] Split table cell text extraction after inline/textbox callback boundary stabilized
- [x] After each slice, update `scripts/lib/docx2md-module-order.mjs` and generated `src/js/`
- [x] After each slice, run `npm run build`, `npm run test:unit`, `npx tsc --noEmit`, and `git diff --check`

## Phase 17: miku-soft Maintenance Refactoring

- [x] Remove unused inline parser helpers before larger parser refactoring
- [x] Share test DOCX ZIP fixture helpers between CLI and runtime tests
- [x] After `w:proofErr` coverage lands, split inline text style resolution from run parsing
- [x] Consider extracting hyperlink target resolution from `document-inline-parser.ts`
- [x] Consider extracting browser asset ZIP packaging from `main.ts`
- [x] Decide whether `.github/workflows/release-assets.yml` should move from GitHub Release published trigger to the miku-soft standard `v*` tag push trigger
- [x] Re-run `npm run build`, `npm run test:unit`, `npm run smoke:version`, `npx tsc --noEmit`, and `git diff --check` after this refactoring slice

## Phase 18: Sister-App Review Follow-up

- [x] Add CLI `--verbose` progress and timing diagnostics on stderr with a stable `verbose:` prefix
- [x] Refactor CLI option parsing toward `FLAG_OPTIONS` and value option definitions, following the `miku-xlsx2md` shape
- [x] Add stage-aware CLI error messages such as `[sample.docx] read failed:` and `[sample.docx] parse failed:`
- [x] Harden image asset export paths so only safe `word/media/...` package paths are exported or linked
  - Reject empty segments, `.` / `..`, absolute paths, and non-`word/media` paths before CLI file output or browser ZIP entry creation
  - Verify CLI `--assets-dir` output cannot escape the selected asset directory

## Phase 19: Node/Web Separation

- [x] Establish separated Web repository `miku-docx2md-web`
- [x] Keep browser UI, Single-file Web App generation, `lht-cmn`, and browser smoke tests in `miku-docx2md-web`
- [x] Clean Web-only files from this main application repository
- [x] Keep this repository focused on product core, CLI, Node.js runtime bundle, and upstream contract for Web
- [x] Fix browser asset ZIP entry timestamps to `2025-01-01 00:00:00` for reproducible ZIP bytes
- [x] Add regression coverage for fixed browser ZIP timestamps and byte-stable output
- [x] Add browser automation for the official Web UI path
  - Cover fixture load, auto-conversion, image link toggle, image link folder changes, and download button enabled/disabled states
  - Moved with the separated Web UI path to `miku-docx2md-web`.
- [x] Add `.docx` fixture hygiene tests modeled after `miku-xlsx2md`
  - Check `docProps/core.xml` for creator, lastModifiedBy, created, and modified metadata
  - Check `docProps/app.xml` for Application and AppVersion metadata
  - Reject undocumented committed fixtures containing `word/comments.xml`, `word/embeddings/`, `word/vbaProject.bin`, or external relationships
  - Allow documented comment fixtures only when comment author/date metadata is scrubbed
