# Real Document Validation: v0.8.2

## Validation Summary

- Date: 2026-05-06
- Version or commit: v0.8.2 work in progress
- Validation set location: local `workplace/validation-docx/`; committed fixture `tests/fixtures/docx/BasicSample01.docx`
- Number of documents checked in this pass: 3
- Word round-trip: opened and closed in Microsoft Word before CLI conversion
- Browser checked: no
- CLI checked: yes
- Documents with embedded images: yes
- Documents with unsupported visual elements: no

Additional generated image validation candidates were attempted but excluded from this pass because Microsoft Word could not open them.

Most `.docx` files used for this pass are local validation files under `workplace/` and are not committed to the repository. `BasicSample01.docx` is intentionally committed as `tests/fixtures/docx/BasicSample01.docx` because it is a Word-authored validation fixture.

## Document Matrix

| ID | Document type | Key features | CLI result | Notes |
| --- | --- | --- | --- | --- |
| doc-001 | validation memo | paragraphs, inline formatting, external link, nested list, table | issue | Conversion completed, but heading style was not preserved after Word save; inline formatting around proofing markers produced noisy Markdown. |
| doc-002 | validation structure sample | section-like labels, numbered list, grid-span table | pass with caveat | Conversion completed; table grid-span placeholder was preserved. Section-like labels were plain paragraphs after Word save. |
| doc-003 | Word-authored basic sample | Heading 1-5, paragraph text, embedded JPEG image | issue | Headings were preserved. Embedded image package part existed, but converter reported `images: 0` and exported no image assets. |

## CLI Commands

```bash
npm run cli -- workplace/validation-docx/01-basic-structure.docx --out workplace/validation-docx/out/01-basic-structure-word.md --summary-out workplace/validation-docx/out/01-basic-structure-word.summary.txt --debug
npm run cli -- workplace/validation-docx/02-lists-and-tables.docx --out workplace/validation-docx/out/02-lists-and-tables-word.md --summary-out workplace/validation-docx/out/02-lists-and-tables-word.summary.txt --debug
npm run cli -- workplace/validation-docx/BasicSample01.docx --out workplace/validation-docx/out/BasicSample01.md --summary-out workplace/validation-docx/out/BasicSample01.summary.txt --assets-dir workplace/validation-docx/out/BasicSample01.assets --debug
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

- Heading 1 through Heading 5
- Heading 1 section for image validation
- normal paragraphs before and after image
- embedded JPEG image

Observed after CLI conversion:

- Heading styles were preserved and rendered as Markdown headings.
- Summary reported `headings: 6`.
- Normal paragraphs before and after the image were preserved.
- The embedded image part existed in the DOCX package at `word/media/image1.jpeg`.
- The drawing referenced `rId5`, and `word/_rels/document.xml.rels` mapped `rId5` to `media/image1.jpeg`.
- The converter reported `images: 0` and `imageAssets: 0`.
- The generated asset manifest was empty.

This is a focused bug candidate for Word-authored inline drawing image extraction.

The document is also committed as a regression fixture:

- `tests/fixtures/docx/BasicSample01.docx`

The current regression test covers the parts that already work: Heading 1-5, the `Image Validation` heading, and the surrounding paragraphs. The missed image extraction remains recorded as a follow-up item.

## Findings

### Bugs

- Inline formatting can become noisy when Word inserts proofing markers between adjacent formatted runs.
- Word-authored inline drawing images can be missed even when the image part and relationship exist.

### Invalid Validation Candidates

- `03-image-and-unsupported.docx` could not be opened by Microsoft Word.
- `04-parser-image-asset.docx` could not be opened by Microsoft Word.

These files are local `workplace/` candidates only and should not be treated as Word-round-tripped validation documents.

### Missing Fixtures

- Add a focused fixture for `w:proofErr` inside or between formatted runs.
- Add a Word-round-tripped fixture or local validation sample that uses real Word heading styles, created directly through Word's UI rather than only generated XML.
- Add a focused fixture based on the Word-authored inline drawing shape from `BasicSample01.docx`.

### Known Limitations / Data Notes

- The generated validation documents are useful for exercising parser paths, but Word can normalize minimal generated DOCX structures. This means a Word-saved validation file may reveal generator limitations as well as converter behavior.
- `BasicSample01.docx` covers a Word-authored embedded JPEG image, but image extraction currently fails for that shape.

## Follow-Up Actions

- [ ] Add a focused regression test for inline formatting across `w:proofErr`.
- [ ] Create or collect a Word-authored document with actual Heading 1 / Heading 2 styles.
- [ ] Run browser validation for these two documents.
- [ ] Fix or characterize image asset extraction for the Word-authored inline drawing shape in `BasicSample01.docx`.
- [ ] Replace invalid generated image candidates with a Word-openable image validation document.
