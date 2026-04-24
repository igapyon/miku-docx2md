# miku-docx2md

`miku-docx2md` is one of the tools in Mikuku's software series.

## What is this?

`miku-docx2md` is a tool that reads Word documents in `.docx` format and converts their textual structure into Markdown.

- runs locally
- aims at meaningful Markdown extraction rather than visual reproduction
- is designed for both human readability and generative AI input

This project follows the sibling-app direction of `miku-xlsx2md` where practical, while adapting the parsing model to Word documents.

- browser UI follows `lht-cmn/` and prefers `lht-*` components
- the page structure and visual language intentionally stay close to `miku-xlsx2md` where reasonable

## Features Direction

The first cut focuses on text-oriented Word content that maps naturally into GitHub-compatible Markdown / HTML.

- paragraphs
- headings
- inline formatting such as `bold`, `italic`, `strike`, and `underline`
- paragraph-internal line breaks as `<br>`
- external hyperlinks
- document-internal hyperlinks when resolvable
- bullet lists
- numbered lists
- nested lists
- tables

## Out of Scope in First Cut

The first cut intentionally excludes visual and layout-heavy Word features.

- images
- shapes
- SmartArt
- WordArt
- text boxes
- floating objects
- charts
- drawing objects
- exact page layout reproduction
- headers / footers
- footnotes / endnotes
- comments
- tracked changes
- macros

## Conversion Policy

`miku-docx2md` prioritizes extracting document structure into meaningful Markdown rather than reproducing Word appearance exactly.

- preserve features that fit naturally into GitHub-compatible Markdown / HTML
- do not force awkward pseudo-reproduction for features that do not fit that output model
- preserve document order
- prefer stable and deterministic output

## Current Design Decisions

- `.docx` is handled as a ZIP package
- ZIP expansion is intended to be implemented in-house, following the sibling-app style
- source-of-truth implementation is intended to live under `src/ts/`
- `main.ts` is intended as the browser UI entry point
- `core.ts` is intended as the conversion orchestration layer

Current first-cut document handling direction includes:

- heading detection by both paragraph style and outline level
- nested list support via `numbering.xml`
- table cell line breaks rendered as `<br>`
- merged table cells simplified with `←M←` and `↑M↑`
- document bookmarks rendered as `<a id="..."></a>` anchors when available
- tabs normalized to four spaces
- consecutive meaningless empty paragraphs compressed
- unsupported elements omitted by default, with optional HTML comment traces in a debug-oriented mode

## Feature Support Overview

| Item | `miku-docx2md` status | Notes |
| --- | --- | --- |
| Read `.docx` files | Implemented | Primary first-cut input |
| Convert document text into Markdown | Implemented | Main project goal |
| Preserve headings | Implemented | Style + outline level based |
| Preserve inline formatting | Implemented | GitHub-compatible Markdown / HTML subset |
| Preserve external hyperlinks | Implemented | Markdown links |
| Preserve document-internal hyperlinks | Implemented | Bookmark-based anchors are emitted as HTML anchors |
| Preserve nested lists | Implemented | Based on numbering structure |
| Extract tables | Implemented | Structural Markdown tables |
| Preserve merged table layout exactly | Not supported | Uses `←M←` / `↑M↑` placeholders instead |
| Extract images and shapes | Not supported in first cut | Explicitly out of scope |
| Reproduce Word appearance exactly | Not supported | Structure over visual fidelity |

## How it works

The intended first-cut flow is:

1. Read a `.docx` file locally
2. Expand the ZIP package
3. Read `document.xml`, rels, styles, and numbering data
4. Build an internal document model
5. Convert supported structure into Markdown

## Node CLI

A basic Node.js CLI path is available in the repository.

Options currently include:

- `--out <file>`
- `--summary`
- `--summary-out <file>`
- `--debug`
- `--include-unsupported-comments`
- `--help`

Example:

```bash
npm run cli -- ./sample.docx --out ./sample.md --summary --summary-out ./sample.summary.txt
```

`--debug` enables unsupported-element HTML comment traces in Markdown output.

## Browser UI

A minimal browser UI is also available via `index.html`.

- select a local `.docx` file
- convert explicitly after file selection
- review summary counts
- review generated Markdown
- download Markdown and summary text
- use built-in preview copy buttons
- optionally enable unsupported-element HTML comments

Build example:

```bash
npm run build
```

This regenerates `index.html` from `index-src.html` and refreshes the generated files under `src/js/`.

## Specifications

For more details, see:

- High-level specification and design policy: [docs/docx2md-spec.md](./docs/docx2md-spec.md)
- Implementation-oriented specification: [docs/docx2md-impl-spec.md](./docs/docx2md-impl-spec.md)
- Upstream reference policy: [docs/upstream.md](./docs/upstream.md)

## Tech Direction

- Runtime: local processing, browser-capable
- Source language: TypeScript
- Build direction: single-file web app style where practical
- Test direction: fixture-based tests

## License

- Released under the Apache License 2.0
- See [LICENSE](./LICENSE) for the full license text
