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
- [ ] Decide whether table-cell headings need dedicated rendering or current simplified text is sufficient
- [ ] Classify unsupported elements in more detail than raw local-name passthrough where useful
- [ ] Expand implementation docs for style inheritance depth and direct-format precedence
