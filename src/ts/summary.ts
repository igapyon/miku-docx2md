/*
 * Copyright 2026 Toshiki Iga
 * SPDX-License-Identifier: Apache-2.0
 */

(() => {
  const moduleRegistry = getDocx2mdModuleRegistry();
  const summaryFields: Array<keyof Docx2mdParsedSummary> = [
    "paragraphs",
    "headings",
    "listItems",
    "tables",
    "images",
    "imageAssets",
    "drawingLikeUnsupported",
    "links",
    "internalLinks",
    "externalLinks",
    "unsupportedElements",
    "unsupportedCommentTraces"
  ];

  function createSummary(parsedDocument: { summary: Docx2mdParsedSummary }): Docx2mdParsedSummary {
    return {
      ...parsedDocument.summary
    };
  }

  function createSummaryText(parsedDocument: {
    summary: Docx2mdParsedSummary;
    blocks: Array<unknown>;
  }): string {
    const summary = createSummary(parsedDocument);
    return summaryFields.map((field) => `${field}: ${summary[field]}`).join("\n");
  }

  moduleRegistry.registerModule("docxSummary", {
    createSummary,
    createSummaryText
  });
})();
