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
- [ ] Run browser conversion against the validation set
- [x] Run CLI conversion against the validation set
- [ ] Compare Markdown readability for headings, lists, links, tables, and image placeholders
  - [x] Word-round-tripped local validation docs 01/02 checked for headings, lists, links, and tables
  - [x] Word-authored `BasicSample01.docx` checked for Heading 1-5 and paragraphs
  - [x] Word-authored `BasicSample01.docx` committed as `tests/fixtures/docx/BasicSample01.docx`
  - [ ] Image placeholder readability is blocked by missed image extraction in `BasicSample01.docx`
- [x] Review generated summaries for obviously wrong counts
- [ ] Review debug output for unsupported trace usefulness
- [ ] Verify image asset export and `manifest.json` on documents with embedded images
  - [ ] Replace invalid generated image validation candidates; `03-image-and-unsupported.docx` and `04-parser-image-asset.docx` were not Word-openable
  - [ ] Fix or characterize missed image extraction from Word-authored `BasicSample01.docx`
- [x] Record recurring incompatibilities as focused fixtures or known limitations

## Phase 13.5: Additional Real Document Test Patterns

- [ ] Add a Word-authored fixture with an embedded inline image that is recognized as an exported asset
- [ ] Add a Word-authored fixture with image alt text / description and verify Markdown alt text
- [ ] Add a Word-authored fixture with bullet and numbered lists created through Word UI
- [ ] Add a Word-authored fixture with nested lists created through Word UI
- [ ] Add a Word-authored fixture with external hyperlink and internal bookmark hyperlink
- [ ] Add a Word-authored fixture with a table created through Word UI, including a merged cell
- [ ] Add a Word-authored fixture with bold / italic / underline / strike combinations across multiple runs
- [ ] Add a focused fixture for Word proofing markers such as `w:proofErr` between formatted runs
- [ ] Add browser-side smoke notes or manual checklist coverage for the committed fixtures

## Phase 13.6: Post-Validation Refactoring

- [ ] After the real-document test pattern additions are complete, refactor the affected parsing modules
- [ ] Keep parser behavior covered by committed fixtures before refactoring
- [ ] Revisit drawing/image extraction boundaries after fixing or characterizing `BasicSample01.docx`
- [ ] Revisit inline formatting run coalescing after adding `w:proofErr` coverage
- [ ] Re-run `npm run build`, `npm run test:unit`, `npm run smoke:version`, and generated artifact sync check after refactoring

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
- [x] After each slice, update `scripts/lib/docx2md-module-order.mjs`, `miku-docx2md-src.html`, and generated `src/js/`
- [x] After each slice, run `npm run build`, `npm run test:unit`, `npx tsc --noEmit`, and `git diff --check`
