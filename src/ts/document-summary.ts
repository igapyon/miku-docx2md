/*
 * Copyright 2026 Toshiki Iga
 * SPDX-License-Identifier: Apache-2.0
 */

(() => {
  const moduleRegistry = getDocx2mdModuleRegistry();

  function createEmptySummary(): Docx2mdParsedSummary {
    return {
      paragraphs: 0,
      headings: 0,
      listItems: 0,
      tables: 0,
      images: 0,
      imageAssets: 0,
      drawingLikeUnsupported: 0,
      links: 0,
      internalLinks: 0,
      externalLinks: 0,
      unsupportedElements: 0,
      unsupportedCommentTraces: 0
    };
  }

  function createEmptyParsedDocument(): Docx2mdParsedDocument {
    return {
      blocks: [],
      summary: createEmptySummary()
    };
  }

  function isDrawingLikeUnsupported(type: string): boolean {
    return type.startsWith("drawing");
  }

  function isResolvedImageUnsupported(type: string): boolean {
    return type.startsWith("drawing:image(");
  }

  function recordUnsupportedSummary(summary: Docx2mdParsedSummary, type: string): void {
    if (isDrawingLikeUnsupported(type)) {
      summary.drawingLikeUnsupported += 1;
    }
    if (isResolvedImageUnsupported(type)) {
      summary.images += 1;
    }
    summary.unsupportedElements += 1;
    summary.unsupportedCommentTraces += 1;
  }

  moduleRegistry.registerModule("documentSummary", {
    createEmptySummary,
    createEmptyParsedDocument,
    recordUnsupportedSummary
  });
})();
