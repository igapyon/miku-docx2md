# Real Document Validation: v0.8.2

## Validation Summary

- Date: 2026-05-06
- Version or commit: v0.8.2 work in progress
- Validation set location: local `workplace/validation-docx/`; committed focused fixtures under `tests/fixtures/docx/word-*.docx`
- Number of documents checked in this pass: 3
- Word round-trip: opened and closed in Microsoft Word before CLI conversion
- Browser checked: no
- CLI checked: yes
- Documents with embedded images: yes
- Documents with unsupported visual elements: no

Additional generated image validation candidates were attempted but excluded from this pass because Microsoft Word could not open them.

Most `.docx` files used for this pass are local validation files under `workplace/` and are not committed to the repository. The earlier mixed `BasicSample01.docx` fixture was replaced by focused Word-authored fixtures under `tests/fixtures/docx/word-*.docx`.

## Document Matrix

| ID | Document type | Key features | CLI result | Notes |
| --- | --- | --- | --- | --- |
| doc-001 | validation memo | paragraphs, inline formatting, external link, nested list, table | issue | Conversion completed, but heading style was not preserved after Word save; inline formatting around proofing markers produced noisy Markdown. |
| doc-002 | validation structure sample | section-like labels, numbered list, grid-span table | pass with caveat | Conversion completed; table grid-span placeholder was preserved. Section-like labels were plain paragraphs after Word save. |
| doc-003 | Word-authored focused fixtures | Heading 1-5, paragraph text, embedded JPEG image | pass | Headings are covered by `word-headings-basic.docx`. Word inline images are covered by focused image fixtures, and converter reports `images: 1` with exported image assets for them. |

## CLI Commands

```bash
npm run cli -- workplace/validation-docx/01-basic-structure.docx --out workplace/validation-docx/out/01-basic-structure-word.md --summary-out workplace/validation-docx/out/01-basic-structure-word.summary.txt --debug
npm run cli -- workplace/validation-docx/02-lists-and-tables.docx --out workplace/validation-docx/out/02-lists-and-tables-word.md --summary-out workplace/validation-docx/out/02-lists-and-tables-word.summary.txt --debug
npm run cli -- tests/fixtures/docx/word-headings-basic.docx --out workplace/validation-docx/out/word-headings-basic.md --summary-out workplace/validation-docx/out/word-headings-basic.summary.txt --debug
npm run cli -- tests/fixtures/docx/word-inline-image-basic.docx --out workplace/validation-docx/out/word-inline-image-basic.md --summary-out workplace/validation-docx/out/word-inline-image-basic.summary.txt --assets-dir workplace/validation-docx/out/word-inline-image-basic.assets --debug
```

Both commands completed successfully.

## Observations

### doc-001

Expected structure from the generated validation source:

- heading-like title
- paragraph
- bold / italic inline formatting
- external hyperlink
- nested list
- table

Observed after Word save and CLI conversion:

- The title appeared as plain text, not Markdown heading.
- Summary reported `headings: 0`.
- The hyperlink was preserved.
- The table remained readable.
- The list remained structured, but Word normalized the original bullet numbering definition to decimal numbering.
- Inline formatting around Word proofing markers produced noisy Markdown:

```markdown
**Bold ****text**and*italic** text*.
```

This should be treated as a focused follow-up candidate: inline formatting should remain readable when Word inserts `w:proofErr` elements between runs.

### doc-002

Expected structure from the generated validation source:

- heading-like title
- heading-like section labels
- numbered list
- grid-span table

Observed after Word save and CLI conversion:

- Heading-like labels appeared as plain paragraphs because Word did not retain heading paragraph styles from the generated source.
- Summary reported `headings: 0`.
- Numbered list items were preserved.
- The table remained readable.
- Grid-span placeholder `←M←` was preserved.

### doc-003

Expected structure:

- Heading 1 through Heading 5 in `word-headings-basic.docx`
- normal paragraphs before and after image in `word-inline-image-basic.docx`
- embedded JPEG image in `word-inline-image-basic.docx`

Observed after CLI conversion:

- Heading styles were preserved and rendered as Markdown headings.
- `word-headings-basic.docx` summary reported `headings: 5`.
- Normal paragraphs before and after the image were preserved in `word-inline-image-basic.docx`.
- The embedded image part existed in the DOCX package at `word/media/image1.jpeg`.
- The drawing referenced `rId5`, and `word/_rels/document.xml.rels` mapped `rId5` to `media/image1.jpeg`.
- The converter now reports `images: 1` and `imageAssets: 1` for the focused image fixtures.
- The generated asset manifest includes `word/media/image1.jpeg`.

This covers Word-authored inline drawing image extraction.

The behavior is now split across focused regression fixtures:

- `tests/fixtures/docx/word-headings-basic.docx`
- `tests/fixtures/docx/word-inline-image-basic.docx`
- `tests/fixtures/docx/word-image-alt-text-basic.docx`

The current regression tests cover heading behavior, inline image extraction, and image alt text behavior.

## Findings

### Bugs

- Inline formatting can become noisy when Word inserts proofing markers between adjacent formatted runs.
- Word-authored inline drawing image extraction is covered by focused regression fixtures.

### Invalid Validation Candidates

- `03-image-and-unsupported.docx` could not be opened by Microsoft Word.
- `04-parser-image-asset.docx` could not be opened by Microsoft Word.

These files are local `workplace/` candidates only and should not be treated as Word-round-tripped validation documents.

### Missing Fixtures

- Add a focused fixture for `w:proofErr` inside or between formatted runs.
- Word-authored heading fixture regression coverage has been added.
- Focused regression coverage based on `word-inline-image-basic.docx` has been added.

### Known Limitations / Data Notes

- The generated validation documents are useful for exercising parser paths, but Word can normalize minimal generated DOCX structures. This means a Word-saved validation file may reveal generator limitations as well as converter behavior.
- `word-inline-image-basic.docx` covers a Word-authored embedded JPEG image and is now extracted as an image asset.

## Follow-Up Actions

- [x] Add a focused regression test for inline formatting across `w:proofErr`.
- [x] Create or collect a Word-authored document with actual Heading 1 / Heading 2 styles.
- [ ] Run browser validation for these two documents.
- [x] Fix or characterize image asset extraction for the Word-authored inline drawing shape in `word-inline-image-basic.docx`.
- [x] Replace invalid generated image candidates with a Word-openable image validation document.

## v0.8.3 Recheck Notes

Date: 2026-05-08

Commands rerun against local validation documents:

```bash
npm run cli -- workplace/validation-docx/01-basic-structure.docx --out workplace/validation-docx/out-current/01-basic-structure.md --summary-out workplace/validation-docx/out-current/01-basic-structure.summary.txt --debug
npm run cli -- workplace/validation-docx/02-lists-and-tables.docx --out workplace/validation-docx/out-current/02-lists-and-tables.md --summary-out workplace/validation-docx/out-current/02-lists-and-tables.summary.txt --debug
npm run cli -- workplace/validation-docx/05-word-openable-image.docx --out workplace/validation-docx/out-current/05-word-openable-image.md --summary-out workplace/validation-docx/out-current/05-word-openable-image.summary.txt --assets-dir workplace/validation-docx/out-current/05-word-openable-image.assets --debug
npm run cli -- tests/fixtures/docx/word-image-alt-text-basic.docx --out workplace/validation-docx/out-current/word-image-alt-text-basic.md --summary-out workplace/validation-docx/out-current/word-image-alt-text-basic.summary.txt --assets-dir workplace/validation-docx/out-current/word-image-alt-text-basic.assets --debug
```

Recheck observations:

- `05-word-openable-image.docx` converted with `images: 1` and `imageAssets: 1`.
- Its asset manifest contains `word/media/word-openable-image.png`, media type `image/png`, alt text `Word openable image alt`, and a nonzero size.
- `word-image-alt-text-basic.docx` converted with `images: 1` and `imageAssets: 1`; manifest media type is `image/jpeg` and alt text is preserved.
- Debug output for image documents contains useful drawing traces with source path, alt text, and dimensions.
- Debug output also exposes `sectPr` as an unsupported trace in these validation documents. This is acceptable diagnostic noise for now.
- Generated `01-basic-structure.docx` still produces noisy inline Markdown around adjacent formatted runs. The focused `w:proofErr` regression is now covered, but broader run coalescing remains a known limitation for generated/minimal validation documents.

Browser automation note:

- No Playwright/Puppeteer dependency is present in this repository.
- Browser validation remains a manual smoke path documented in [browser-smoke-checklist.md](./browser-smoke-checklist.md).
