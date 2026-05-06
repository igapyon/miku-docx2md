# Real Document Validation Template

Use this template when validating `miku-docx2md` with local real `.docx` files.

Do not commit private, sensitive, or customer documents. Record only anonymized observations and recurring patterns that are safe to keep in the repository.

## Validation Summary

- Date:
- Version or commit:
- Validator:
- Validation set location: local only / public sample / other
- Number of documents:
- Browser checked: yes / no
- CLI checked: yes / no
- Documents with embedded images: yes / no
- Documents with unsupported visual elements: yes / no

## Document Matrix

| ID | Document type | Key features | Browser result | CLI result | Asset result | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| doc-001 | memo / specification / report / other | headings, lists, tables, links, images | pass / issue | pass / issue | pass / issue / n/a | |

## Browser Checks

For each document, confirm:

- Markdown preview is readable.
- Summary preview is plausible.
- Debug comments are useful when unsupported comments are enabled.
- Image asset ZIP is available when resolved embedded images exist.

## CLI Checks

Run:

```bash
npm run cli -- ./sample.docx --out ./sample.md --summary --summary-out ./sample.summary.txt
npm run cli -- ./sample.docx --out ./sample.debug.md --debug
```

For documents with embedded images, also run:

```bash
npm run cli -- ./sample.docx --out ./sample.md --assets-dir ./sample.assets --summary --summary-out ./sample.summary.txt
```

Confirm:

- Markdown file is created.
- Summary file is created when requested.
- Asset directory is created when requested.
- `manifest.json` exists when assets are exported.
- Markdown image links point to exported asset files.

## Findings

### Bugs

- None recorded.

### Missing Fixtures

- None recorded.

### Known Limitations

- None recorded.

### Documentation Updates

- None recorded.

## Follow-Up Actions

- [ ] Add focused fixture tests for recurring bugs.
- [ ] Update known limitations when behavior is expected but surprising.
- [ ] Update README or usage docs when user-facing behavior is unclear.
