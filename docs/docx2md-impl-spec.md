# docx2md Implementation Specification

## 1. Document Role

This document is the implementation-oriented companion to `docx2md-spec.md`.

Its purpose is to record how the actual `docx2md` implementation behaves, once the first cut begins to take shape.

This document should eventually describe:

- implementation-aligned behavior based on the TypeScript source under `src/ts/`
- actual processing order and fallback behavior
- internal models and conversion boundaries
- places where implementation reality differs from idealized design intention

At the current stage, this file serves as the implementation-spec skeleton.

## 2. Relationship to Other Documents

The intended role split is:

- [README.md](../README.md)
  - entry document for users and readers
- [docx2md-spec.md](./docx2md-spec.md)
  - high-level specification, design policy, and first-cut scope
- [docx2md-impl-spec.md](./docx2md-impl-spec.md)
  - implementation-aligned behavior, internal structure, and concrete processing rules
- [upstream.md](./upstream.md)
  - policy for referring to the sibling upstream app `miku-xlsx2md`

If implementation behavior and high-level intention differ, this document should record the actual behavior explicitly.

## 3. Intended Coverage

Once implementation starts, this document should be updated to describe at least:

1. overall processing flow
2. ZIP reading behavior
3. XML parsing behavior
4. relationship resolution behavior
5. style resolution behavior
6. numbering and list resolution behavior
7. heading detection behavior
8. hyperlink resolution behavior
9. table parsing behavior
10. Markdown rendering behavior
11. summary and diagnostic behavior
12. browser UI / CLI behavior when implemented

## 4. Current Implementation Status

At the moment, the implementation is not yet established.
Therefore, this document does not describe current code behavior yet.

Until the first cut exists, the authoritative source for design intent remains:

- [docx2md-spec.md](./docx2md-spec.md)

## 5. Sections To Fill During Implementation

The following sections are expected to be expanded as code is added.

### 5.1 Overall Flow

To be filled with the concrete end-to-end flow, for example:

1. read `.docx`
2. expand ZIP entries
3. load required XML
4. build internal document model
5. render Markdown
6. emit summary / diagnostics

### 5.2 ZIP Handling

To record:

- supported ZIP methods
- entry enumeration strategy
- path normalization behavior
- error handling for invalid archives

### 5.3 XML Utilities

To record:

- DOM parsing behavior
- namespace handling strategy
- text extraction helpers
- line-break and whitespace handling at XML-read time

### 5.4 Relationship Resolution

To record:

- `document.xml.rels` parsing
- hyperlink relationship resolution
- path normalization rules
- broken or missing relationship fallback behavior

### 5.5 Style Resolution

To record:

- paragraph style lookup
- character style lookup
- direct formatting precedence
- `basedOn` inheritance traversal
- cycle detection behavior

### 5.6 Heading Detection

To record:

- `pStyle` resolution behavior
- outline-level fallback behavior
- localized heading-name compatibility
- exact heading-level mapping used by code

### 5.7 Numbering and Lists

To record:

- `numbering.xml` model
- `numId` and `ilvl` resolution
- unordered vs ordered list detection
- nested list rendering details
- fallback when numbering data is broken

### 5.8 Hyperlinks and Anchors

To record:

- external hyperlink rendering
- internal anchor resolution
- anchor name normalization
- fallback behavior for unresolved targets

### 5.9 Tables

To record:

- table model
- row and cell traversal
- merged-cell detection
- placeholder rendering with `←M←` / `↑M↑`
- cell-paragraph joining rules

### 5.10 Markdown Rendering

To record:

- paragraph rendering
- inline formatting wrapper order
- line-break normalization
- whitespace normalization
- block separation rules

### 5.11 Unsupported Elements and Debug Output

To record:

- which elements are treated as unsupported
- whether they are ignored or traced
- debug switch behavior
- HTML comment trace format

### 5.12 Summary and Diagnostics

To record:

- summary fields
- counting rules
- unsupported-element counts
- comment-trace counts

## 6. Known Implementation Questions

The following are still expected to be finalized during implementation work:

- exact debug option name for unsupported-comment output
- internal anchor normalization rules
- nested-list indentation width
- exact representation of list-like or paragraph-like content inside table cells
- summary presentation surface in UI and/or CLI

These items should move from “question” to “documented behavior” as soon as code decisions are made.
