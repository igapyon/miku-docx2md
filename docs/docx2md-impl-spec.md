# docx2md Implementation Specification

## 1. Document Role

This document records the current implementation-aligned behavior of `docx2md`.

It complements:

- [README.md](../README.md)
  - entry document for users and readers
- [docx2md-spec.md](./docx2md-spec.md)
  - high-level specification and design policy
- [upstream.md](./upstream.md)
  - policy for referring to the sibling upstream app `miku-xlsx2md`

When implementation behavior differs from idealized design intent, this document should describe the implementation behavior explicitly.

## 2. Current Implementation Scope

The current first cut includes:

- in-house `.docx` ZIP entry reading
- XML DOM parsing utilities
- relationship resolution for document hyperlinks
- style-based and outline-level heading detection
- inline formatting for bold, italic, strike, underline, and paragraph-internal `<br>`
- external hyperlinks and document-internal hyperlinks
- nested lists based on `numbering.xml`
- structural table extraction
- merge placeholders `←M←` and `↑M↑`
- summary counts
- unsupported-element diagnostics
- Node.js CLI
- browser UI based on `lht-cmn/`

The current first cut still excludes:

- image extraction
- drawing / shape extraction
- exact layout reproduction
- header / footer, footnotes, comments, tracked changes

## 3. Overall Flow

The current end-to-end flow is:

1. read a `.docx` file as bytes
2. expand ZIP entries in-house
3. load `word/document.xml`
4. optionally load `word/_rels/document.xml.rels`, `word/styles.xml`, and `word/numbering.xml`
5. parse document blocks in document order
6. build a lightweight parsed document with `blocks` and `summary`
7. render Markdown
8. optionally emit summary text and unsupported debug comments

## 4. ZIP Handling

Current behavior:

- ZIP expansion is performed by the project code rather than by an external ZIP library
- required entries are looked up by normalized package path
- `word/document.xml` is mandatory
- missing optional entries fall back to empty behavior rather than immediate failure

If `word/document.xml` is missing, parsing fails with an explicit error.

## 5. XML Utilities

Current behavior:

- XML bytes are decoded as UTF-8 text
- parsing uses `DOMParser`
- lookup is based on `localName` rather than namespace prefix spelling
- helper functions exist for direct-child lookup, descendant lookup, and text extraction

Whitespace is not aggressively normalized at XML-read time. Most text normalization happens during inline extraction and Markdown rendering.

## 6. Relationship Resolution

Current behavior:

- `word/_rels/document.xml.rels` is parsed into a map keyed by relationship id
- external hyperlink targets are preserved as-is
- internal package targets are resolved relative to `word/document.xml`
- missing relationship ids do not fail the whole conversion

For hyperlink rendering:

- `r:id` with a known relationship becomes an external Markdown link
- missing or broken relationship ids fall back to plain link text unless a `w:anchor` target is available

## 7. Style and Heading Resolution

Current behavior:

- heading detection uses both paragraph style and outline level
- direct `Heading n` / `見出し n` recognition is supported
- style resolution walks the style chain returned by `styles.xml`
- style-chain heading names and outline levels are both considered
- paragraph-local `outlineLvl` acts as a fallback when style-based heading detection does not resolve a level

Heading levels are clamped to Markdown heading range `1..6`.

## 8. Inline Formatting

Current behavior:

- run formatting supports bold, italic, strike, and underline
- wrapper order is:
  - underline
  - strike
  - italic
  - bold
- paragraph-internal `w:br` becomes `<br>`
- tabs are normalized to four spaces
- repeated spaces are compacted during inline normalization
- surrounding whitespace is trimmed at the resulting inline string level

Hyperlink text suppresses underline wrapping so that link syntax is not nested with underline output.

## 9. Hyperlinks and Anchors

Current behavior:

- external hyperlinks render as `[text](url)`
- internal hyperlinks with `w:anchor` render as `[text](#anchor)`
- paragraph bookmarks from `bookmarkStart` are collected as block anchor ids
- bookmark names starting with `_` are ignored
- known paragraph bookmarks render as HTML anchors before the block:
  - `<a id="anchor"></a>`
- anchor normalization trims whitespace, lowercases, collapses spaces to `-`, replaces unsupported punctuation with `-`, and collapses repeated `-`
- the same normalization is applied to bookmark owners and internal hyperlink targets so links remain aligned

## 10. Numbering and Lists

Current behavior:

- `numbering.xml` is parsed into `abstractNum` and `num` mappings
- `numId` and `ilvl` are used to determine list kind and nesting depth
- bullet-like numbering becomes `-`
- ordered numbering becomes `1.`
- indentation width is `4 spaces` per nesting level

If numbering metadata cannot be resolved, the paragraph falls back to ordinary paragraph behavior rather than forcing a synthetic list.

## 11. Tables

Current behavior:

- tables are parsed in document order
- each row is read from `w:tr`
- each cell is read from `w:tc`
- cell text is built from paragraph content
- multiple paragraphs inside a cell are joined by `<br><br>`
- list paragraphs inside table cells are preserved as simplified inline list text using `-` or `1.`
- nested list depth inside table cells is represented with repeated `&nbsp;&nbsp;&nbsp;&nbsp;`
- horizontal merge placeholders use `←M←`
- vertical merge continuation placeholders use `↑M↑`
- additional horizontally spanned cells inside a vertical continuation row use `←M←`
- shorter rows are padded with empty cells so the Markdown table stays rectangular

Markdown rendering uses the first row as the header row.

## 12. Markdown Rendering

Current behavior:

- paragraphs render as plain Markdown blocks
- headings render as `#` through `######`
- list items render with bullet or ordered markers and 4-space nesting
- tables render as Markdown tables
- unsupported blocks are omitted by default
- unsupported blocks render as HTML comments only when debug-style output is enabled

Anchor rendering is inserted immediately before the owning paragraph, heading, or list item block.

## 13. Summary and Diagnostics

Current summary fields are:

- `paragraphs`
- `headings`
- `listItems`
- `tables`
- `links`
- `internalLinks`
- `externalLinks`
- `unsupportedElements`
- `unsupportedCommentTraces`

`unsupportedCommentTraces` currently mirrors `unsupportedElements`.

## 14. Browser UI and CLI

### 14.1 Browser UI

Current browser UI behavior:

- uses `lht-cmn/` as the shared component base
- uses `lht-page-hero`, `lht-file-select`, `lht-switch-help`, `lht-preview-output`, `lht-loading-overlay`, `lht-error-alert`, and `lht-toast`
- allows file selection first and explicit conversion second
- supports Markdown save and summary save
- uses `lht-preview-output` built-in copy actions for preview text
- toggles unsupported HTML comments via a switch

Page-local CSS lives in `src/css/app.css`.

### 14.2 Node.js CLI

Current CLI options include:

- `--out <file>`
- `--summary`
- `--summary-out <file>`
- `--debug`
- `--include-unsupported-comments`
- `--help`

`--debug` and `--include-unsupported-comments` currently enable the same Markdown behavior.

## 15. Open Items

The main remaining implementation questions are:

- whether table-cell headings or other richer block structures need dedicated rendering beyond simplified inline text
- broader unsupported-element classification detail
- fuller implementation-aligned documentation for `styles.xml` inheritance depth
