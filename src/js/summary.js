/*
 * Copyright 2026 Toshiki Iga
 * SPDX-License-Identifier: Apache-2.0
 */
(() => {
    const moduleRegistry = getDocx2mdModuleRegistry();
    const summaryFields = [
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
    function createSummary(parsedDocument) {
        return {
            ...parsedDocument.summary
        };
    }
    function createSummaryText(parsedDocument) {
        const summary = createSummary(parsedDocument);
        return summaryFields.map((field) => `${field}: ${summary[field]}`).join("\n");
    }
    moduleRegistry.registerModule("docxSummary", {
        createSummary,
        createSummaryText
    });
})();
