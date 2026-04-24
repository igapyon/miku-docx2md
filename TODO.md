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
- [ ] Heading detection
- [ ] Inline formatting
- [x] External hyperlinks
- [x] Internal hyperlinks
- [ ] Lists with nesting
- [ ] Tables
- [ ] Merge placeholders `←M←` / `↑M↑`

## Phase 4: Diagnostics

- [ ] Summary counts
- [ ] Unsupported element diagnostics
- [ ] Debug option for unsupported HTML comments

## Phase 5: Tests

- [x] Plain paragraph fixture
- [ ] Heading fixture
- [ ] Inline formatting fixture
- [x] External hyperlink fixture
- [x] Internal hyperlink fixture
- [ ] Nested list fixture
- [ ] Table fixture
- [ ] Unsupported element debug fixture
